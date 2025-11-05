const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'db');
const FILE = path.join(dbPath, 'inventory.json');

// helpers
function read(){ try { return JSON.parse(fs.readFileSync(FILE)); } catch(e){ return []; } }
function write(data){ fs.writeFileSync(FILE, JSON.stringify(data, null, 2)); }

// GET all
router.get('/', (req, res) => {
  const data = read();
  res.json(data);
});

// POST add
router.post('/', (req, res) => {
  const { sku, name, quantity, category } = req.body;
  if (!sku || !name) return res.status(400).json({ message: 'Missing fields' });
  const data = read();
  if (data.find(i=>i.sku === sku)) return res.status(409).json({ message: 'SKU exists' });
  const item = { id: Date.now().toString(), sku, name, quantity: Number(quantity)||0, category };
  data.push(item);
  write(data);
  // log
  const logs = JSON.parse(fs.readFileSync(path.join(dbPath,'logs.json')));
  logs.unshift({ action: `Added item: ${name} (SKU: ${sku}, Qty: ${quantity})`, time: new Date().toLocaleString() });
  fs.writeFileSync(path.join(dbPath,'logs.json'), JSON.stringify(logs, null,2));
  res.json(item);
});

// PUT update
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const data = read();
  const idx = data.findIndex(i=>i.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  const { sku, name, quantity, category } = req.body;
  data[idx] = { ...data[idx], sku, name, quantity: Number(quantity)||0, category };
  write(data);
  const logs = JSON.parse(fs.readFileSync(path.join(dbPath,'logs.json')));
  logs.unshift({ action: `Edited item: ${name} (SKU: ${sku})`, time: new Date().toLocaleString() });
  fs.writeFileSync(path.join(dbPath,'logs.json'), JSON.stringify(logs, null,2));
  res.json(data[idx]);
});

// DELETE
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  const data = read();
  const idx = data.findIndex(i=>i.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  const removed = data.splice(idx,1)[0];
  write(data);
  const logs = JSON.parse(fs.readFileSync(path.join(dbPath,'logs.json')));
  logs.unshift({ action: `Deleted item: ${removed.name}`, time: new Date().toLocaleString() });
  fs.writeFileSync(path.join(dbPath,'logs.json'), JSON.stringify(logs, null,2));
  res.json({ message: 'Deleted' });
});

module.exports = router;
