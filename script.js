// ===============================
// CONFIG (Render Backend)
// ===============================
const API_BASE = "https://online-inventory-documents-system.onrender.com/api";

// ===============================
// LOGIN REDIRECT
// ===============================
if (!sessionStorage.getItem("isLoggedIn") && !window.location.pathname.includes("login.html")) {
  window.location.href = "login.html";
}

// ===============================
// GLOBAL VARIABLES
// ===============================
let inventory = [];
let documents = [];
let activityLog = [];
const currentPage = window.location.pathname.split("/").pop();

// ===============================
// ON LOAD
// ===============================
window.onload = async function () {
  try {
    if (currentPage.includes("inventory")) await fetchInventory();
    else if (currentPage.includes("documents")) await fetchDocuments();
    else if (currentPage.includes("log")) await fetchLogs();

    const adminName = sessionStorage.getItem("adminName") || localStorage.getItem("adminName");
    if (document.getElementById("adminName")) {
      document.getElementById("adminName").textContent = adminName || "Admin";
    }

    const theme = localStorage.getItem("theme");
    if (theme === "dark") document.body.classList.add("dark-mode");
  } catch (err) {
    console.error("Initialization failed:", err);
  }
};

// ===============================
// AUTH (Login/Register)
// ===============================
async function login() {
  const user = document.getElementById("username")?.value.trim();
  const pass = document.getElementById("password")?.value.trim();
  const msg = document.getElementById("loginMessage");
  msg.textContent = "";

  if (!user || !pass) {
    msg.textContent = "⚠️ Please enter username and password.";
    msg.style.color = "red";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, password: pass }),
    });
    const data = await res.json();

    if (res.ok) {
      sessionStorage.setItem("isLoggedIn", "true");
      sessionStorage.setItem("adminName", data.username);
      localStorage.setItem("adminName", data.username);
      msg.textContent = "✅ Login successful! Redirecting...";
      msg.style.color = "green";
      setTimeout(() => (window.location.href = "index.html"), 800);
    } else {
      msg.textContent = data.message || "❌ Invalid username or password.";
      msg.style.color = "red";
    }
  } catch {
    msg.textContent = "❌ Unable to contact server.";
    msg.style.color = "red";
  }
}

async function register() {
  const user = document.getElementById("newUsername")?.value.trim();
  const pass = document.getElementById("newPassword")?.value.trim();
  const code = document.getElementById("securityCode")?.value.trim();
  const msg = document.getElementById("registerMessage");
  msg.textContent = "";

  if (!user || !pass || !code) {
    msg.textContent = "⚠️ Please fill in all fields.";
    msg.style.color = "red";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, password: pass, securityCode: code }),
    });
    const data = await res.json();

    if (res.ok) {
      msg.textContent = "✅ Registered successfully! You can now log in.";
      msg.style.color = "green";
      setTimeout(toggleForm, 1200);
    } else {
      msg.textContent = data.message || "❌ Registration failed.";
      msg.style.color = "red";
    }
  } catch {
    msg.textContent = "❌ Unable to contact server.";
    msg.style.color = "red";
  }
}

function toggleForm() {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const formTitle = document.getElementById("formTitle");

  if (loginForm.style.display === "none") {
    loginForm.style.display = "block";
    registerForm.style.display = "none";
    formTitle.textContent = "🔐 Admin Login";
  } else {
    loginForm.style.display = "none";
    registerForm.style.display = "block";
    formTitle.textContent = "🧾 Register Account";
  }
}

// ===============================
// INVENTORY CRUD
// ===============================
async function fetchInventory() {
  try {
    const res = await fetch(`${API_BASE}/inventory`);
    if (!res.ok) throw new Error("Failed to fetch inventory.");
    inventory = await res.json();
    displayInventory();
  } catch (err) {
    console.error(err);
    alert("⚠️ Unable to load inventory data.");
  }
}

async function addItem() {
  const sku = prompt("Enter SKU:");
  const name = prompt("Enter item name:");
  const quantity = parseInt(prompt("Enter quantity:"), 10);
  const category = prompt("Enter category:");

  if (!sku || !name || isNaN(quantity) || !category) {
    alert("⚠️ Please fill all fields correctly!");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/inventory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, name, quantity, category }),
    });
    if (res.ok) {
      await fetchInventory();
      await fetchLogs();
      alert("✅ Item added successfully!");
    } else alert("⚠️ Failed to add item.");
  } catch {
    alert("⚠️ Unable to contact server.");
  }
}

async function editItem(i) {
  const item = inventory[i];
  const sku = prompt("Edit SKU:", item.sku);
  const name = prompt("Edit name:", item.name);
  const quantity = parseInt(prompt("Edit quantity:", item.quantity), 10);
  const category = prompt("Edit category:", item.category);
  if (!sku || !name || isNaN(quantity) || !category) return;

  try {
    const res = await fetch(`${API_BASE}/inventory/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, name, quantity, category }),
    });
    if (res.ok) {
      await fetchInventory();
      await fetchLogs();
      alert("✅ Item updated!");
    }
  } catch {
    alert("⚠️ Unable to contact server.");
  }
}

async function deleteItem(i) {
  const item = inventory[i];
  if (!confirm(`Delete "${item.name}"?`)) return;
  try {
    const res = await fetch(`${API_BASE}/inventory/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchInventory();
      await fetchLogs();
      alert("🗑️ Item deleted!");
    }
  } catch {
    alert("⚠️ Unable to contact server.");
  }
}

function displayInventory() {
  const tbody = document.querySelector("#inventoryTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  inventory.forEach((item, i) => {
    const row = document.createElement("tr");
    if (item.quantity < 5) row.classList.add("low-stock");
    row.innerHTML = `
      <td>${item.sku}</td>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>${item.category}</td>
      <td>
        <button onclick="editItem(${i})">✏️</button>
        <button onclick="deleteItem(${i})">🗑</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ===============================
// DOCUMENTS (CRUD + DOWNLOAD)
// ===============================
async function fetchDocuments() {
  try {
    const res = await fetch(`${API_BASE}/documents`);
    if (!res.ok) throw new Error("Failed to load documents.");
    documents = await res.json();
    renderDocuments();
  } catch (err) {
    console.error(err);
    alert("⚠️ Unable to load documents from server.");
  }
}

async function uploadDocuments() {
  const input = document.getElementById("docUpload");
  const files = Array.from(input.files);
  if (!files.length) return alert("No files selected.");

  const form = new FormData();
  files.forEach((f) => form.append("documents", f));

  try {
    const res = await fetch(`${API_BASE}/documents`, { method: "POST", body: form });
    if (res.ok) {
      await fetchDocuments();
      await fetchLogs();
      alert("✅ Documents uploaded successfully!");
    } else {
      alert("⚠️ Upload failed.");
    }
  } catch {
    alert("⚠️ Unable to contact server.");
  }
  input.value = "";
}

async function deleteDocument(i) {
  const doc = documents[i];
  if (!confirm(`Delete "${doc.name}"?`)) return;

  try {
    const res = await fetch(`${API_BASE}/documents/${doc.id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchDocuments();
      await fetchLogs();
      alert("🗑 Document deleted!");
    }
  } catch {
    alert("⚠️ Unable to contact server.");
  }
}

async function downloadDocument(id, name) {
  try {
    const res = await fetch(`${API_BASE}/documents/${id}/download`);
    if (!res.ok) throw new Error("Download failed.");
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    console.error(err);
    alert("⚠️ Unable to download file.");
  }
}

function renderDocuments() {
  const list = document.getElementById("docList");
  if (!list) return;
  list.innerHTML = "";

  documents.forEach((d, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${d.name} (${(d.size / 1024).toFixed(1)} KB)</span>
      <button onclick="downloadDocument('${d.id}', '${d.name}')">⬇️</button>
      <button onclick="deleteDocument(${i})">🗑</button>
    `;
    list.appendChild(li);
  });
}

// ===============================
// ACTIVITY LOG
// ===============================
async function fetchLogs() {
  try {
    const res = await fetch(`${API_BASE}/logs`);
    if (!res.ok) throw new Error("Failed to load logs.");
    activityLog = await res.json();
    displayLog();
  } catch (err) {
    console.error(err);
  }
}

function displayLog() {
  const list = document.getElementById("logList");
  if (!list) return;
  list.innerHTML = "";
  activityLog.forEach((log) => {
    const li = document.createElement("li");
    li.textContent = `${log.time} - ${log.action}`;
    list.appendChild(li);
  });
}

// ===============================
// UTILITIES
// ===============================
function logout() {
  sessionStorage.removeItem("isLoggedIn");
  sessionStorage.removeItem("adminName");
  window.location.href = "login.html";
}

function toggleTheme() {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
}
