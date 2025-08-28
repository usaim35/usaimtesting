const smsForm = document.getElementById("smsForm");
const smsPreview = document.getElementById("smsPreview");
const logTableBody = document.getElementById("logTableBody");
const searchInput = document.getElementById("searchInput");
const totalDebited = document.getElementById("totalDebited");
const totalCredited = document.getElementById("totalCredited");
const transactionChartCanvas = document.getElementById("transactionChart");
const toast = new bootstrap.Toast(document.getElementById("toast"));

let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let chart;
let pieChart;
let lastDeleted = null; // For undo feature

// Confetti Animation
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
      color: `hsl(${Math.random() * 360},100%,50%)`,
      tilt: Math.random() * 10 - 10
    });
  }
  let angle = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    angle += 0.01;
    for (let i = 0; i < confetti.length; i++) {
      let c = confetti[i];
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

// Pie Chart
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
      plugins: {
        legend: { position: "bottom" }
      }
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

// Update theme icon
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

// Utility to generate random status (simulating delivery)
const getRandomStatus = () => {
  const statuses = ["Delivered", "Pending", "Failed"];
  return statuses[Math.floor(Math.random() * statuses.length)];
};

// Handle SMS Form Submission
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
  };

  transactions.push(newTransaction);
  saveTransactions();
  renderLogs(searchInput.value);
  updateSummary();
  updateChart();
  showSMSPreview(newTransaction);

  // --- Auto-download as .txt file (Notepad) ---
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

// Save transactions and update pie chart
function saveTransactions() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
  updatePieChart();
}

// Render transaction logs
function renderLogs(filter = "") {
  logTableBody.innerHTML = "";
  const filtered = transactions.filter(tx =>
    tx.name.toLowerCase().includes(filter.toLowerCase())
  );
  filtered.forEach(tx => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${tx.name}</td>
      <td>${tx.bank}</td>
      <td>${tx.amount}</td>
      <td>${tx.type}</td>
      <td>${tx.userType}</td>
      <td><span class="badge ${getBadgeClass(tx.status)}">${tx.status}</span></td>
      <td>${tx.time}</td>
      <td>
        <button class="delete-btn" onclick="deleteTransaction(${tx.id})">Delete</button>
      </td>
    `;
    logTableBody.appendChild(tr);
  });
}

// Delete a transaction (with undo support)
function deleteTransaction(id) {
  lastDeleted = transactions.find(tx => tx.id === id);
  transactions = transactions.filter(tx => tx.id !== id);
  saveTransactions();
  renderLogs(searchInput.value);
  updateSummary();
  updateChart();
  // Show undo button if present
  const undoBtn = document.getElementById("undoBtn");
  if (undoBtn) undoBtn.style.display = "inline-block";
}

// Undo last delete
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

// Clear all logs
function clearLogs() {
  if (confirm("Are you sure you want to clear all logs?")) {
    transactions = [];
    saveTransactions();
    renderLogs();
    updateSummary();
    updateChart();
  }
}

// Update summary cards
function updateSummary() {
  const debited = transactions.filter(tx => tx.type === "debited").reduce((a, b) => a + b.amount, 0);
  const credited = transactions.filter(tx => tx.type === "credited").reduce((a, b) => a + b.amount, 0);
  if (totalDebited) totalDebited.textContent = debited.toFixed(2);
  if (totalCredited) totalCredited.textContent = credited.toFixed(2);

  // Total transaction count
  if (document.getElementById("totalCount")) {
    document.getElementById("totalCount").textContent = transactions.length;
  }

  // Animated progress bar (debited vs credited)
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

// Show SMS preview
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

// Copy SMS preview to clipboard
function copyPreview() {
  const temp = document.createElement("textarea");
  temp.value = smsPreview.innerText;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand("copy");
  document.body.removeChild(temp);
  // Optionally show a toast or alert here
}

// Search input event
searchInput.addEventListener("input", () => {
  renderLogs(searchInput.value);
});

// Chart.js Bar Chart (example)
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
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
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

// Helper to determine badge color
function getBadgeClass(status) {
  if (status === "Delivered") return "badge-delivered";
  if (status === "Pending") return "badge-pending";
  return "badge-failed";
}

// CSV Export
function exportToCSV() {
  let csv = "Name,Bank,Amount,Type,UserType,Status,Time\n";
  transactions.forEach(tx => {
    csv += `${tx.name},${tx.bank},${tx.amount},${tx.type},${tx.userType},${tx.status},${tx.time}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, "transactions.csv");
}

// Initialize on load
window.addEventListener("load", () => {
  applyThemeFromStorage();
  renderLogs();
  updateSummary();
  initChart();
  initPieChart();
});
