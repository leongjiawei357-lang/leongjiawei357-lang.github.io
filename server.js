// ===============================
// IMPORTS
// ===============================
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 5000;

// ===============================
// MIDDLEWARE
// ===============================
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===============================
// DATABASE (JSON FILES)
// ===============================
const dbPath = path.join(__dirname, "db");
if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });

function readDB(name) {
  const filePath = path.join(dbPath, name);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "[]");
  try {
    return JSON.parse(fs.readFileSync(filePath));
  } catch {
    return [];
  }
}

function writeDB(name, data) {
  fs.writeFileSync(path.join(dbPath, name), JSON.stringify(data, null, 2));
}

// ===============================
// MULTER SETUP (for documents)
// ===============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// ===============================
// LOG FUNCTION
// ===============================
function addLog(action) {
  const logs = readDB("logs.json");
  logs.push({ time: new Date().toLocaleString(), action });
  writeDB("logs.json", logs);
}

// ===============================
// AUTH ROUTES
// ===============================
const SECURITY_CODE = "COMPANY-SECURE-2025"; // company code for register

app.post("/api/register", (req, res) => {
  const { username, password, securityCode } = req.body;
  if (securityCode !== SECURITY_CODE)
    return res.status(400).json({ message: "Invalid security code." });

  const users = readDB("users.json");
  if (users.find((u) => u.username === username)) {
    return res.status(400).json({ message: "Username already exists." });
  }

  users.push({ id: Date.now(), username, password });
  writeDB("users.json", users);
  addLog(`👤 Registered new user: ${username}`);
  res.json({ message: "Registered successfully!" });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const users = readDB("users.json");
  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ message: "Invalid username or password." });
  addLog(`🔐 User logged in: ${username}`);
  res.json({ username: user.username });
});

// ===============================
// INVENTORY ROUTES
// ===============================
app.get("/api/inventory", (req, res) => {
  res.json(readDB("inventory.json"));
});

app.post("/api/inventory", (req, res) => {
  const items = readDB("inventory.json");
  const item = { id: Date.now(), ...req.body };
  items.push(item);
  writeDB("inventory.json", items);
  addLog(`📦 Added inventory item: ${item.name}`);
  res.json(item);
});

app.put("/api/inventory/:id", (req, res) => {
  const items = readDB("inventory.json");
  const idx = items.findIndex((i) => i.id == req.params.id);
  if (idx === -1) return res.status(404).json({ message: "Item not found" });
  items[idx] = { ...items[idx], ...req.body };
  writeDB("inventory.json", items);
  addLog(`✏️ Updated item: ${items[idx].name}`);
  res.json(items[idx]);
});

app.delete("/api/inventory/:id", (req, res) => {
  let items = readDB("inventory.json");
  const item = items.find((i) => i.id == req.params.id);
  if (!item) return res.status(404).json({ message: "Item not found" });
  items = items.filter((i) => i.id != req.params.id);
  writeDB("inventory.json", items);
  addLog(`🗑️ Deleted inventory item: ${item.name}`);
  res.json({ message: "Deleted" });
});

// ===============================
// DOCUMENT ROUTES
// ===============================
app.get("/api/documents", (req, res) => {
  res.json(readDB("documents.json"));
});

app.post("/api/documents", upload.array("documents"), (req, res) => {
  const docs = readDB("documents.json");
  req.files.forEach((f) => {
    docs.push({
      id: Date.now() + Math.random(),
      name: f.originalname,
      path: f.path,
      size: f.size,
      date: new Date().toLocaleString(),
    });
  });
  writeDB("documents.json", docs);
  addLog(`📁 Uploaded ${req.files.length} document(s).`);
  res.json({ message: "Uploaded successfully" });
});

app.delete("/api/documents/:id", (req, res) => {
  let docs = readDB("documents.json");
  const doc = docs.find((d) => d.id == req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found" });

  // Delete file from uploads folder
  if (fs.existsSync(doc.path)) fs.unlinkSync(doc.path);

  docs = docs.filter((d) => d.id != req.params.id);
  writeDB("documents.json", docs);
  addLog(`🗑️ Deleted document: ${doc.name}`);
  res.json({ message: "Deleted" });
});

// ✅ DOWNLOAD ROUTE
app.get("/api/documents/:id/download", (req, res) => {
  const docs = readDB("documents.json");
  const doc = docs.find((d) => d.id == req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found" });

  res.download(doc.path, doc.name, (err) => {
    if (err) console.error("Download error:", err);
    else addLog(`⬇️ Downloaded document: ${doc.name}`);
  });
});

// ===============================
// LOG ROUTES
// ===============================
app.get("/api/logs", (req, res) => {
  res.json(readDB("logs.json"));
});

// ===============================
// FRONTEND SERVING (STATIC FILES)
// ===============================
app.use(express.static(path.join(__dirname, "../client")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// ===============================
// START SERVER
// ===============================
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
