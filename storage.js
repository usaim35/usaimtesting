// Storage module for SMS Campaign Pro

export function getTransactions() {
  return JSON.parse(localStorage.getItem("transactions")) || [];
}

export function saveTransactions(transactions) {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

export function getPinnedIds() {
  return JSON.parse(localStorage.getItem("pinnedIds")) || [];
}

export function savePinnedIds(pinnedIds) {
  localStorage.setItem("pinnedIds", JSON.stringify(pinnedIds));
}

export function getTheme() {
  return localStorage.getItem("theme") || "light";
}

export function saveTheme(theme) {
  localStorage.setItem("theme", theme);
}

export function getTemplates() {
  return JSON.parse(localStorage.getItem("smsTemplates")) || [
    "Dear {name}, your account at {bank} has been {type} with ₹{amount}.",
    "Hi {name}, {amount} was {type} from your {bank} account.",
    "Hello {name}, transaction of ₹{amount} ({type}) at {bank}."
  ];
}

export function saveTemplates(templates) {
  localStorage.setItem("smsTemplates", JSON.stringify(templates));
}