// UI module for SMS Campaign Pro

export function showConfetti() {
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

export function showSpinner(show = true) {
  const spinner = document.getElementById("loadingSpinner");
  if (spinner) spinner.style.display = show ? "block" : "none";
}

export function showToast(message, success = true) {
  const toastEl = document.getElementById("toast");
  if (!toastEl) return;
  toastEl.classList.remove("bg-success", "bg-danger");
  toastEl.classList.add(success ? "bg-success" : "bg-danger");
  toastEl.querySelector(".toast-body").textContent = message;
  new bootstrap.Toast(toastEl).show();
}

export function animateSMSPreview() {
  const smsPreview = document.getElementById("smsPreview");
  if (!smsPreview) return;
  smsPreview.classList.add("animate");
  setTimeout(() => smsPreview.classList.remove("animate"), 500);
}

// Simple i18n (multi-language) support
const translations = {
  en: { send: "Send SMS", logs: "Logs", templates: "Templates" },
  es: { send: "Enviar SMS", logs: "Registros", templates: "Plantillas" },
  fr: { send: "Envoyer SMS", logs: "Journaux", templates: "Modèles" }
};

export function applyI18n(lang) {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (translations[lang] && translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });
}

// AI SMS suggestion (stub/demo)
export function suggestSMS() {
  const smsPreview = document.getElementById("smsPreview");
  if (smsPreview) {
    smsPreview.textContent = "AI suggestion: Dear Customer, your account has been credited with ₹1000.";
    animateSMSPreview();
  }
}

// Undo/Redo stack for delete actions
let undoStack = [];
export function pushUndo(transactions) {
  undoStack.push(JSON.parse(JSON.stringify(transactions)));
}
export function popUndo() {
  return undoStack.length > 0 ? undoStack.pop() : null;
}