import * as storage from './storage.js';
import { initCharts, updateCharts } from './charts.js';
import { showConfetti, showSpinner, showToast, animateSMSPreview, applyI18n, suggestSMS, pushUndo, popUndo } from './ui.js';

// DOM Elements
const smsForm = document.getElementById("smsForm");
const smsPreview = document.getElementById("smsPreview");
const logTableBody = document.getElementById("logTableBody");
const searchInput = document.getElementById("searchInput");
const totalDebited = document.getElementById("totalDebited");
const totalCredited = document.getElementById("totalCredited");
const transactionChartCanvas = document.getElementById("transactionChart");
const pieChartCanvas = document.getElementById("pieChart");
const langSelect = document.getElementById("langSelect");

// State
let transactions = storage.getTransactions();
let pinnedIds = storage.getPinnedIds();
let selectedIds = new Set();
let showColumns = {
  name: true, bank: true, amount: true, type: true, userType: true, status: true, time: true, action: true
};
let filterType = "all";
let lastDeleted = null;

// --- Theme Toggle ---
function toggleTheme() {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  storage.saveTheme(isDark ? "dark" : "light");
  document.getElementById("themeIcon").textContent = isDark ? "🌙" : "☀️";
}
window.toggleTheme = toggleTheme;

function applyThemeFromStorage() {
  const theme = storage.getTheme();
  if (theme === "dark") {
    document.body.classList.add("dark-mode");
    document.getElementById("themeIcon").textContent = "🌙";
  } else {
    document.body.classList.remove("dark-mode");
    document.getElementById("themeIcon").textContent = "☀️";
  }
}

// --- SMS Templates ---
function loadTemplates() {
  const sel = document.getElementById("smsTemplate");
  sel.innerHTML = "";
  storage.getTemplates().forEach((tpl, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = tpl;
    sel.appendChild(opt);
  });
}
window.applyTemplate = function(index) {
  const tpl = storage.getTemplates()[index];
  const name = document.getElementById("customerName").value || "Customer";
  const bank = document.getElementById("bankName").value || "Bank";
  const amount = document.getElementById("amount").value || "0";
  const type = document.getElementById("transactionType").value || "debited";
  const msg = tpl.replace("{name}", name).replace("{bank}", bank).replace("{amount}", amount).replace("{type}", type);
  smsPreview.textContent = msg;
  animateSMSPreview();
};
window.suggestSMS = suggestSMS;

// --- Form Submission ---
smsForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("customerName").value.trim();
  const bank = document.getElementById("bankName").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const type = document.getElementById("transactionType").value;
  const userType = document.getElementById("userType").value;

  if (!name || !bank || isNaN(amount) || !type) {
    showToast("Please fill all fields correctly.", false);
    return;
  }

  const newTransaction = {
    id: Date.now(),
    name,
    bank,
    amount,
    type,
    userType,
    status: getRandomStatus(),
    time: new Date().toLocaleString(),
    pinned: false,
    tags: []
  };

  pushUndo(transactions);
  transactions.push(newTransaction);
  storage.saveTransactions(transactions);
  renderLogs(searchInput.value);
  updateSummary();
  updateCharts(transactions);
  showSMSPreview(newTransaction);

  // Auto-download as .txt file
  const txtContent =
    `Name: ${newTransaction.name}\n` +
    `Bank: ${newTransaction.bank}\n` +
    `Amount: ${newTransaction.amount}\n` +
    `Type: ${newTransaction.type}\n` +
    `User Type: ${newTransaction.userType}\n` +
    `Status: ${newTransaction.status}\n` +
    `Time: ${newTransaction.time}\n`;
  const blob = new Blob([txtContent], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `transaction_${newTransaction.id}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  showToast("SMS Sent Successfully!");
  showConfetti();
  document.getElementById("smsSound").play();
  smsForm.reset();
});

// --- Utility ---
function getRandomStatus() {
  const statuses = ["Delivered", "Pending", "Failed"];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

// --- Save & Render ---
function renderLogs(filter = "", fromDate, toDate) {
  logTableBody.innerHTML = "";
  let filtered = transactions
    .filter(tx => tx.name.toLowerCase().includes(filter.toLowerCase()))
    .filter(tx => filterType === "all" ? true : tx.type === filterType);

  if (fromDate && toDate) {
    filtered = filtered.filter(tx => {
      const txDate = new Date(tx.time);
      return txDate >= fromDate && txDate <= toDate;
    });
  }

  // Pinned transactions first
  filtered = [
    ...filtered.filter(tx => pinnedIds.includes(tx.id)),
    ...filtered.filter(tx => !pinnedIds.includes(tx.id))
  ];

  filtered.forEach(tx => {
    const tr = document.createElement("tr");
    tr.className = tx.pinned ? "table-info" : "";
    tr.innerHTML = `
      <td>
        <input type="checkbox" class="select-row" data-id="${tx.id}" ${selectedIds.has(tx.id) ? "checked" : ""}>
        ${showColumns.name ? tx.name : ""}
        ${pinnedIds.includes(tx.id) ? ' <span title="Pinned">📌</span>' : ""}
      </td>
      ${showColumns.bank ? `<td>${tx.bank}</td>` : ""}
      ${showColumns.amount ? `<td>${tx.amount}</td>` : ""}
      ${showColumns.type ? `<td>${tx.type}</td>` : ""}
      ${showColumns.userType ? `<td>${tx.userType}</td>` : ""}
      ${showColumns.status ? `<td><span class="badge ${getBadgeClass(tx.status)}">${tx.status}</span></td>` : ""}
      ${showColumns.time ? `<td>${tx.time}</td>` : ""}
      ${showColumns.action ? `<td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editTransaction(${tx.id})">✏️</button>
        <button class="btn btn-sm btn-outline-warning me-1" onclick="pinTransaction(${tx.id})">${pinnedIds.includes(tx.id) ? "Unpin" : "Pin"}</button>
        <button class="delete-btn" onclick="deleteTransaction(${tx.id})">Delete</button>
        <button class="btn btn-sm btn-outline-info ms-1" onclick="showDetails(${tx.id})">Details</button>
      </td>` : ""}
    `;
    tr.onclick = (e) => {
      if (e.target.classList.contains("select-row")) return;
      showDetails(tx.id);
    };
    logTableBody.appendChild(tr);
  });

  // Checkbox listeners for bulk delete
  document.querySelectorAll(".select-row").forEach(cb => {
    cb.addEventListener("change", function() {
      const id = Number(this.dataset.id);
      if (this.checked) selectedIds.add(id);
      else selectedIds.delete(id);
    });
  });
}

// --- Edit Transaction ---
window.editTransaction = function(id) {
  const tx = transactions.find(t => t.id === id);
  if (!tx) return;
  const name = prompt("Edit Name:", tx.name);
  if (name === null) return;
  const bank = prompt("Edit Bank:", tx.bank);
  if (bank === null) return;
  const amount = prompt("Edit Amount:", tx.amount);
  if (amount === null || isNaN(amount)) return;
  tx.name = name;
  tx.bank = bank;
  tx.amount = parseFloat(amount);
  storage.saveTransactions(transactions);
  renderLogs(searchInput.value);
  updateSummary();
  updateCharts(transactions);
};

// --- Pin/Favorite Transaction ---
window.pinTransaction = function(id) {
  if (pinnedIds.includes(id)) {
    pinnedIds = pinnedIds.filter(pid => pid !== id);
  } else {
    pinnedIds.push(id);
  }
  storage.savePinnedIds(pinnedIds);
  renderLogs(searchInput.value);
};

// --- Filter by Transaction Type ---
window.setFilterType = function(type) {
  filterType = type;
  renderLogs(searchInput.value);
};

// --- Show/Hide Columns ---
window.toggleColumn = function(col) {
  showColumns[col] = !showColumns[col];
  renderLogs(searchInput.value);
};

// --- Bulk Delete ---
window.bulkDelete = function() {
  if (selectedIds.size === 0) return showToast("No transactions selected.", false);
  if (!confirm("Delete selected transactions?")) return;
  pushUndo(transactions);
  transactions = transactions.filter(tx => !selectedIds.has(tx.id));
  selectedIds.clear();
  storage.saveTransactions(transactions);
  renderLogs(searchInput.value);
  updateSummary();
  updateCharts(transactions);
};

// --- Transaction Details Modal ---
window.showDetails = function(id) {
  const tx = transactions.find(t => t.id === id);
  if (!tx) return;
  let modal = document.getElementById("detailsModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "modal fade";
    modal.id = "detailsModal";
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content text-center p-4">
          <div class="modal-header">
            <h5 class="modal-title">Transaction Details</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" id="detailsBody"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  document.getElementById("detailsBody").innerHTML = `
    <div><b>Name:</b> ${tx.name}</div>
    <div><b>Bank:</b> ${tx.bank}</div>
    <div><b>Amount:</b> ₹${tx.amount}</div>
    <div><b>Type:</b> ${tx.type}</div>
    <div><b>User Type:</b> ${tx.userType}</div>
    <div><b>Status:</b> ${tx.status}</div>
    <div><b>Time:</b> ${tx.time}</div>
    <div><b>Pinned:</b> ${pinnedIds.includes(tx.id) ? "Yes" : "No"}</div>
  `;
  new bootstrap.Modal(modal).show();
};

// --- Delete a transaction (with undo support) ---
window.deleteTransaction = function(id) {
  pushUndo(transactions);
  lastDeleted = transactions.find(tx => tx.id === id);
  transactions = transactions.filter(tx => tx.id !== id);
  storage.saveTransactions(transactions);
  renderLogs(searchInput.value);
  updateSummary();
  updateCharts(transactions);
  const undoBtn = document.getElementById("undoBtn");
  if (undoBtn) undoBtn.style.display = "inline-block";
  playDeleteSound();
  if (window.navigator.vibrate) window.navigator.vibrate(80);
};

// --- Undo last delete ---
window.undoDelete = function() {
  const prev = popUndo();
  if (prev) {
    transactions = prev;
    storage.saveTransactions(transactions);
    renderLogs(searchInput.value);
    updateSummary();
    updateCharts(transactions);
    lastDeleted = null;
    const undoBtn = document.getElementById("undoBtn");
    if (undoBtn) undoBtn.style.display = "none";
  }
};

// --- Clear all logs ---
window.clearLogs = function() {
  if (confirm("Are you sure you want to clear all logs?")) {
    pushUndo(transactions);
    transactions = [];
    storage.saveTransactions(transactions);
    renderLogs();
    updateSummary();
    updateCharts(transactions);
  }
};

// --- Update summary cards ---
function updateSummary() {
  const debited = transactions.filter(tx => tx.type === "debited").reduce((a, b) => a + b.amount, 0);
  const credited = transactions.filter(tx => tx.type === "credited").reduce((a, b) => a + b.amount, 0);
  if (totalDebited) totalDebited.textContent = debited.toFixed(2);
  if (totalCredited) totalCredited.textContent = credited.toFixed(2);
  if (document.getElementById("totalCount")) {
    document.getElementById("totalCount").textContent = transactions.length;
  }
  // Animated progress bar
  const debitedCount = transactions.filter(tx => tx.type === "debited").length;
  const creditedCount = transactions.filter(tx => tx.type === "credited").length;
  const total = debitedCount + creditedCount;
  const debitedPercent = total ? (debitedCount / total) * 100 : 50;
  const creditedPercent = total ? (creditedCount / total) * 100 : 50;
  if (document.getElementById("debitedBar") && document.getElementById("creditedBar")) {
    document.getElementById("debitedBar").style.width = debitedPercent + "%";
    document.getElementById("creditedBar").style.width = creditedPercent + "%";
    document.getElementById("debitedBar").textContent = `Debited (${debitedCount})`;
    document.getElementById("creditedBar").textContent = `Credited (${creditedCount})`;
  }
}

// --- Show SMS preview ---
function showSMSPreview(tx) {
  smsPreview.innerHTML = `
    <div>
      <strong>${tx.bank}</strong>: Dear ${tx.name}, your account has been <b>${tx.type}</b> with <b>₹${tx.amount}</b>.<br>
      User: ${tx.userType} <br>
      Status: <span class="badge ${getBadgeClass(tx.status)}">${tx.status}</span><br>
      <small>${tx.time}</small>
    </div>
  `;
  animateSMSPreview();
}

// --- Copy SMS preview to clipboard ---
window.copyPreview = function() {
  const temp = document.createElement("textarea");
  temp.value = smsPreview.innerText;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand("copy");
  document.body.removeChild(temp);
  showToast("Copied to clipboard!");
};

// --- Search input event ---
searchInput.addEventListener("input", () => {
  renderLogs(searchInput.value);
});

// --- Date Range Filter ---
window.filterByDate = function() {
  const from = new Date(document.getElementById("dateFrom").value);
  const to = new Date(document.getElementById("dateTo").value);
  renderLogs(searchInput.value, from, to);
};

// --- Chart.js Bar Chart ---
initCharts(transactionChartCanvas, pieChartCanvas);

// --- Helper to determine badge color ---
function getBadgeClass(status) {
  if (status === "Delivered") return "badge-delivered";
  if (status === "Pending") return "badge-pending";
  return "badge-failed";
}

// --- CSV Export ---
window.exportToCSV = function() {
  showSpinner(true);
  let csv = "Name,Bank,Amount,Type,UserType,Status,Time\n";
  transactions.forEach(tx => {
    csv += `${tx.name},${tx.bank},${tx.amount},${tx.type},${tx.userType},${tx.status},${tx.time}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, "transactions.csv");
  setTimeout(() => showSpinner(false), 800);
};

// --- Export as PDF (requires jsPDF) ---
window.exportToPDF = function() {
  if (typeof jsPDF === "undefined") {
    showToast("jsPDF library not loaded!", false);
    return;
  }
  showSpinner(true);
  setTimeout(() => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Transaction Logs", 10, 15);
    doc.setFontSize(10);
    let y = 25;
    transactions.forEach((tx, i) => {
      doc.text(
        [
          `#${i + 1}`,
          `Name: ${tx.name}`,
          `Bank: ${tx.bank}`,
          `Amount: ₹${tx.amount}`,
          `Type: ${tx.type}`,
          `User: ${tx.userType}`,
          `Status: ${tx.status}`,
          `Time: ${tx.time}`
        ].join(" | "),
        10, y
      );
      y += 8;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
    doc.save("transactions.pdf");
    showSpinner(false);
  }, 500);
};

// --- Keyboard Shortcuts ---
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === "f") {
    e.preventDefault();
    searchInput.focus();
  }
  if (e.ctrlKey && e.key.toLowerCase() === "n") {
    e.preventDefault();
    document.getElementById("customerName").focus();
  }
  if (e.ctrlKey && e.key.toLowerCase() === "b") {
    e.preventDefault();
    window.bulkDelete();
  }
});

// --- Sound/Vibration Feedback for Delete ---
function playDeleteSound() {
  const audio = new Audio("https://cdn.pixabay.com/audio/2022/03/15/audio_115b9bfae3.mp3");
  audio.play();
}

// --- Multi-language (i18n) support ---
langSelect.addEventListener("change", function() {
  applyI18n(this.value);
});

// --- On load ---
window.addEventListener("load", () => {
  applyThemeFromStorage();
  loadTemplates();
  renderLogs();
  updateSummary();
  updateCharts(transactions);
  applyI18n(langSelect.value);
});
