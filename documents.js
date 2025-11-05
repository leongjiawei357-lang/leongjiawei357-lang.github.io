const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dbPath = path.join(__dirname, '..', 'db');
const UP = path.join(__dirname, '..', 'uploads');
const DOCS = path.join(dbPath, 'documents.json');

if (!fs.existsSync(UP)) fs.mkdirSync(UP);

// storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UP),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g,'_'))
});
const upload = multer({ storage });

function read(){ try { return JSON.parse(fs.readFileSync(DOCS)); } catch(e){ return []; } }
function write(data){ fs.writeFileSync(DOCS, JSON.stringify(data, null, 2)); }

// GET docs
router.get('/', (req, res) => res.json(read()) );

// POST upload
router.post('/', upload.array('documents', 10), (req, res) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ message: 'No files' });
  const docs = read();
  for (let f of files){
    const entry = { id: Date.now().toString() + Math.random().toString(36).slice(2,7), name: f.originalname, filename: f.filename, size: f.size, date: new Date().toLocaleString(), url: '/uploads/' + f.filename };
    docs.push(entry);
    // log
    const logs = JSON.parse(fs.readFileSync(path.join(dbPath,'logs.json')));
    logs.unshift({ action: `Uploaded: ${f.originalname}`, time: new Date().toLocaleString() });
    fs.writeFileSync(path.join(dbPath,'logs.json'), JSON.stringify(logs, null,2));
  }
  write(docs);
  res.json({ message: 'Uploaded', files: files.length });
});

// DELETE
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  const docs = read();
  const idx = docs.findIndex(d=>d.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  const rem = docs.splice(idx,1)[0];
  // remove file
  try { fs.unlinkSync(path.join(UP, rem.filename)); } catch(e){}
  write(docs);
  const logs = JSON.parse(fs.readFileSync(path.join(dbPath,'logs.json')));
  logs.unshift({ action: `Deleted document: ${rem.name}`, time: new Date().toLocaleString() });
  fs.writeFileSync(path.join(dbPath,'logs.json'), JSON.stringify(logs, null,2));
  res.json({ message: 'Deleted' });
});

module.exports = router;
