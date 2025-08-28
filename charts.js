// Chart module for SMS Campaign Pro

let chart, pieChart;

export function initCharts(transactionChartCanvas, pieChartCanvas) {
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

  pieChart = new Chart(pieChartCanvas, {
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
}

export function updateCharts(transactions) {
  const debited = transactions.filter(tx => tx.type === "debited").reduce((a, b) => a + b.amount, 0);
  const credited = transactions.filter(tx => tx.type === "credited").reduce((a, b) => a + b.amount, 0);
  if (chart) {
    chart.data.datasets[0].data = [debited, credited];
    chart.update();
  }
  const debitedCount = transactions.filter(tx => tx.type === "debited").length;
  const creditedCount = transactions.filter(tx => tx.type === "credited").length;
  if (pieChart) {
    pieChart.data.datasets[0].data = [debitedCount, creditedCount];
    pieChart.update();
  }
}