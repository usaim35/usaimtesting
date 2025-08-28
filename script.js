// === SMS Campaign Pro Main Script ===

// DOM Elements
const smsForm = document.getElementById("smsForm");
const smsPreview = document.getElementById("smsPreview");
const logTableBody = document.getElementById("logTableBody");
const searchInput = document.getElementById("searchInput");
const totalDebited = document.getElementById("totalDebited");
const totalCredited = document.getElementById("totalCredited");
const transactionChartCanvas = document.getElementById("transactionChart");
const toast = new bootstrap.Toast(document.getElementById("toast"));

// State
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let chart, pieChart;
let lastDeleted = null;
let pinnedIds = JSON.parse(localStorage.getItem("pinnedIds")) || [];
let selectedIds = new Set();
let showColumns = {
  name: true, bank: true, amount: true, type: true, userType: true, status: true, time: true, action: true
};
let filterType = "all";

// --- Confetti Animation ---
function showConfetti() {
  const canvas = document.getElementById("confettiCanvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = "block";
  const ctx = canvas.getContext("2d");
  let confetti = [];
  for (let i = 0; i < 150; i++) {
    confetti.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * 50 + 10,
      color: `hsl(${Math.random() * 360},100%,50%)`
    });
  }
  let angle = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    angle += 0.01;
    for (let c of confetti) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2, false);
      ctx.fillStyle = c.color;
      ctx.fill();
      c.y += Math.cos(angle + c.d) + 1 + c.r / 2;
      c.x += Math.sin(angle) * 2;
      if (c.y > canvas.height) {
        c.x = Math.random() * canvas.width;
        c.y = -10;
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
  setTimeout(() => { canvas.style.display = "none"; }, 1500);
}

// --- Pie Chart ---
function initPieChart() {
  pieChart = new Chart(document.getElementById("pieChart"), {
    type: "pie",
    data: {
      labels: ["Debited", "Credited"],
      datasets: [{
        data: [0, 0],
        backgroundColor: ["#dc3545", "#28a745"]
      }]
    },
    options: {
      plugins: { legend: { position: "bottom" } }
    }
  });
  updatePieChart();
}
function updatePieChart() {
  const debited = transactions.filter(tx => tx.type === "debited").length;
  const credited = transactions.filter(tx => tx.type === "credited").length;
  if (pieChart) {
    pieChart.data.datasets[0].data = [debited, credited];
    pieChart.update();
  }
}

// --- Theme Toggle ---
function toggleTheme() {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  document.getElementById("themeIcon").textContent = isDark ? "🌙" : "☀️";
}
function applyThemeFromStorage() {
  const theme = localStorage.getItem("theme");
  if (theme === "dark") {
    document.body.classList.add("dark-mode");
    document.getElementById("themeIcon").textContent = "🌙";
  } else {
    document.body.classList.remove("dark-mode");
    document.getElementById("themeIcon").textContent = "☀️";
  }
}

// --- Utility ---
const getRandomStatus = () => {
  const statuses = ["Delivered", "Pending", "Failed"];
  return statuses[Math.floor(Math.random() * statuses.length)];
};

// --- Form Submission ---
smsForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("customerName").value.trim();
  const bank = document.getElementById("bankName").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const type = document.getElementById("transactionType").value;
  const userType = document.getElementById("userType").value;

  if (!name || !bank || isNaN(amount) || !type) {
    alert("Please fill all fields correctly.");
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
    pinned: false
  };

  transactions.push(newTransaction);
  saveTransactions();
  renderLogs(searchInput.value);
  updateSummary();
  updateChart();
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

  toast.show();
  showConfetti();
  document.getElementById("smsSound").play();
  smsForm.reset();
});

// --- Save & Render ---
function saveTransactions() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
  updatePieChart();
}
function renderLogs(filter = "") {
  logTableBody.innerHTML = "";
  let filtered = transactions
    .filter(tx => tx.name.toLowerCase().includes(filter.toLowerCase()))
    .filter(tx => filterType === "all" ? true : tx.type === filterType);

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
function editTransaction(id) {
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
  saveTransactions();
  renderLogs(searchInput.value);
  updateSummary();
  updateChart();
}

// --- Pin/Favorite Transaction ---
function pinTransaction(id) {
  if (pinnedIds.includes(id)) {
    pinnedIds = pinnedIds.filter(pid => pid !== id);
  } else {
    pinnedIds.push(id);
  }
  localStorage.setItem("pinnedIds", JSON.stringify(pinnedIds));
  renderLogs(searchInput.value);
}

// --- Filter by Transaction Type ---
function setFilterType(type) {
  filterType = type;
  renderLogs(searchInput.value);
}

// --- Show/Hide Columns ---
function toggleColumn(col) {
  showColumns[col] = !showColumns[col];
  renderLogs(searchInput.value);
}

// --- Bulk Delete ---
function bulkDelete() {
  if (selectedIds.size === 0) return alert("No transactions selected.");
  if (!confirm("Delete selected transactions?")) return;
  transactions = transactions.filter(tx => !selectedIds.has(tx.id));
  selectedIds.clear();
  saveTransactions();
  renderLogs(searchInput.value);
  updateSummary();
  updateChart();
}

// --- Transaction Details Modal ---
function showDetails(id) {
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
}

// --- Animated Counter for Summary Cards ---
function animateCounter(id, end) {
  const el = document.getElementById(id);
  if (!el) return;
  let start = 0;
  const duration = 600;
  const step = Math.ceil(end / (duration / 16));
  function update() {
    start += step;
    if (start >= end) {
      el.textContent = end.toFixed(2);
      return;
    }
    el.textContent = start.toFixed(2);
    requestAnimationFrame(update);
  }
  update();
}

// --- Delete a transaction (with undo support) ---
function deleteTransaction(id) {
  lastDeleted = transactions.find(tx => tx.id === id);
  transactions = transactions.filter(tx => tx.id !== id);
  saveTransactions();
  renderLogs(searchInput.value);
  updateSummary();
  updateChart();
  const undoBtn = document.getElementById("undoBtn");
  if (undoBtn) undoBtn.style.display = "inline-block";
  playDeleteSound();
  if (window.navigator.vibrate) window.navigator.vibrate(80);
}

// --- Undo last delete ---
function undoDelete() {
  if (lastDeleted) {
    transactions.push(lastDeleted);
    saveTransactions();
    renderLogs(searchInput.value);
    updateSummary();
    updateChart();
    lastDeleted = null;
    const undoBtn = document.getElementById("undoBtn");
    if (undoBtn) undoBtn.style.display = "none";
  }
}

// --- Clear all logs ---
function clearLogs() {
  if (confirm("Are you sure you want to clear all logs?")) {
    transactions = [];
    saveTransactions();
    renderLogs();
    updateSummary();
    updateChart();
  }
}

// --- Update summary cards ---
function updateSummary() {
  const debited = transactions.filter(tx => tx.type === "debited").reduce((a, b) => a + b.amount, 0);
  const credited = transactions.filter(tx => tx.type === "credited").reduce((a, b) => a + b.amount, 0);
  if (totalDebited) animateCounter("totalDebited", debited);
  if (totalCredited) animateCounter("totalCredited", credited);
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
  smsPreview.classList.add("animate");
  setTimeout(() => smsPreview.classList.remove("animate"), 500);
}

// --- Copy SMS preview to clipboard ---
function copyPreview() {
  const temp = document.createElement("textarea");
  temp.value = smsPreview.innerText;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand("copy");
  document.body.removeChild(temp);
}

// --- Search input event ---
searchInput.addEventListener("input", () => {
  renderLogs(searchInput.value);
});

// --- Chart.js Bar Chart ---
function initChart() {
  if (!transactionChartCanvas) return;
  chart = new Chart(transactionChartCanvas, {
    type: "bar",
    data: {
      labels: ["Debited", "Credited"],
      datasets: [{
        label: "Amount",
        data: [0, 0],
        backgroundColor: ["#dc3545", "#28a745"]
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
  updateChart();
}
function updateChart() {
  if (!chart) return;
  const debited = transactions.filter(tx => tx.type === "debited").reduce((a, b) => a + b.amount, 0);
  const credited = transactions.filter(tx => tx.type === "credited").reduce((a, b) => a + b.amount, 0);
  chart.data.datasets[0].data = [debited, credited];
  chart.update();
}

// --- Helper to determine badge color ---
function getBadgeClass(status) {
  if (status === "Delivered") return "badge-delivered";
  if (status === "Pending") return "badge-pending";
  return "badge-failed";
}

// --- CSV Export ---
function exportToCSV() {
  let csv = "Name,Bank,Amount,Type,UserType,Status,Time\n";
  transactions.forEach(tx => {
    csv += `${tx.name},${tx.bank},${tx.amount},${tx.type},${tx.userType},${tx.status},${tx.time}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, "transactions.csv");
}

// --- Export as PDF (requires jsPDF) ---
function exportToPDF() {
  if (typeof jsPDF === "undefined") {
    alert("jsPDF library not loaded!");
    return;
  }
  const doc = new jsPDF();
  doc.text("Transaction Logs", 10, 10);
  let y = 20;
  transactions.forEach(tx => {
    doc.text(
      `Name: ${tx.name}, Bank: ${tx.bank}, Amount: ${tx.amount}, Type: ${tx.type}, User: ${tx.userType}, Status: ${tx.status}, Time: ${tx.time}`,
      10, y
    );
    y += 8;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });
  doc.save("transactions.pdf");
}

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
    bulkDelete();
  }
});

// --- Sound/Vibration Feedback for Delete ---
function playDeleteSound() {
  const audio = new Audio("https://cdn.pixabay.com/audio/2022/03/15/audio_115b9bfae3.mp3");
  audio.play();
}

// --- Initialize on load ---
window.addEventListener("load", () => {
  applyThemeFromStorage();
  renderLogs();
  updateSummary();
  initChart();
  initPieChart();
});
