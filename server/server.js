/**
 * LCR App - Backend Server
 * ========================
 * Express + SQLite server for the LAN Records Management System.
 * Run with: node server.js
 * Listens on 0.0.0.0:3000 — accessible from all devices on the LAN.
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────
const PORT = 3000;
const HOST = '0.0.0.0'; // Accept connections from all network interfaces
const JWT_SECRET = 'lcr-app-secret-key-change-in-production';
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DB_PATH = path.join(__dirname, 'lcr.db');

// ─────────────────────────────────────────────
// Ensure directories exist
// ─────────────────────────────────────────────
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ─────────────────────────────────────────────
// Database Setup (SQLite)
// ─────────────────────────────────────────────
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'staff',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    serial_number TEXT,
    page_number TEXT,
    category TEXT,
    description TEXT,
    tags TEXT,
    image_filename TEXT,
    date TEXT DEFAULT (datetime('now')),
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS birth_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lcr_number TEXT,
    date_of_registration TEXT,
    name_of_child TEXT NOT NULL,
    sex TEXT,
    date_of_birth TEXT,
    place_of_birth TEXT,
    type_of_birth TEXT,
    "order" TEXT,
    mother_name TEXT,
    mother_age TEXT,
    mother_nationality TEXT,
    mother_religion TEXT,
    father_name TEXT,
    father_age TEXT,
    father_nationality TEXT,
    father_religion TEXT,
    municipality_province TEXT,
    remarks TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS death_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lcr_number TEXT,
    date_of_registration TEXT,
    name_of_deceased TEXT NOT NULL,
    sex TEXT,
    date_of_death TEXT,
    place_of_death TEXT,
    cause_of_death TEXT,
    age_at_death TEXT,
    civil_status TEXT,
    nationality TEXT,
    religion TEXT,
    occupation TEXT,
    mother_name TEXT,
    father_name TEXT,
    informant_name TEXT,
    informant_relationship TEXT,
    remarks TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );
`);

// Seed a default admin user if none exists
const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!existingUser) {
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', 'admin123', 'admin');
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('staff', 'staff123', 'staff');
  console.log('✅ Default users created:');
  console.log('   Username: admin   Password: admin123');
  console.log('   Username: staff   Password: staff123');
}

// ─────────────────────────────────────────────
// File Upload (Multer)
// ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `record-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// ─────────────────────────────────────────────
// Auth Middleware
// ─────────────────────────────────────────────
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─────────────────────────────────────────────
// Express App
// ─────────────────────────────────────────────
const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded images as static files
// Access via: http://172.16.11.220:3000/uploads/filename.jpg
app.use('/uploads', express.static(UPLOADS_DIR));

// ─────────────────────────────────────────────
// Routes: Auth
// ─────────────────────────────────────────────

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// ─────────────────────────────────────────────
// Routes: Stats (Dashboard)
// ─────────────────────────────────────────────

// GET /api/stats
app.get('/api/stats', authenticate, (req, res) => {
  const totalRecords = db.prepare('SELECT COUNT(*) as count FROM records').get().count;
  const todayRecords = db.prepare(
    "SELECT COUNT(*) as count FROM records WHERE date(created_at) = date('now')"
  ).get().count;
  const categories = db.prepare('SELECT COUNT(DISTINCT category) as count FROM records WHERE category IS NOT NULL AND category != ""').get().count;

  res.json({
    totalRecords,
    todayRecords,
    totalCategories: categories,
    syncStatus: 'Online',
  });
});

// ─────────────────────────────────────────────
// Routes: Records
// ─────────────────────────────────────────────

// GET /api/records?query=searchTerm&category=HR
app.get('/api/records', authenticate, (req, res) => {
  const { query = '', category = '', limit = 50, offset = 0 } = req.query;

  let sql = 'SELECT * FROM records WHERE 1=1';
  const params = [];

  if (query) {
    sql += ' AND (name LIKE ? OR serial_number LIKE ? OR tags LIKE ? OR description LIKE ?)';
    const q = `%${query}%`;
    params.push(q, q, q, q);
  }

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const records = db.prepare(sql).all(...params);

  // Attach full image URL
  const host = req.get('host');
  const protocol = req.protocol;
  const enriched = records.map(r => ({
    ...r,
    imageUrl: r.image_filename
      ? `${protocol}://${host}/uploads/${r.image_filename}`
      : null,
  }));

  res.json({ records: enriched, total: enriched.length });
});

// GET /api/records/:id
app.get('/api/records/:id', authenticate, (req, res) => {
  const record = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id);

  if (!record) {
    return res.status(404).json({ error: 'Record not found' });
  }

  const host = req.get('host');
  const protocol = req.protocol;

  res.json({
    ...record,
    imageUrl: record.image_filename
      ? `${protocol}://${host}/uploads/${record.image_filename}`
      : null,
  });
});

// POST /api/records  (multipart/form-data)
app.post('/api/records', authenticate, upload.single('image'), (req, res) => {
  const { name, serialNumber, pageNumber, category, description, tags, date } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const imageFilename = req.file ? req.file.filename : null;

  const result = db.prepare(`
    INSERT INTO records (name, serial_number, page_number, category, description, tags, image_filename, date, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    serialNumber || null,
    pageNumber || null,
    category || null,
    description || null,
    tags || null,
    imageFilename,
    date || new Date().toISOString(),
    req.user.id
  );

  const newRecord = db.prepare('SELECT * FROM records WHERE id = ?').get(result.lastInsertRowid);
  const host = req.get('host');

  res.status(201).json({
    ...newRecord,
    imageUrl: imageFilename ? `${req.protocol}://${host}/uploads/${imageFilename}` : null,
  });
});

// DELETE /api/records/:id
app.delete('/api/records/:id', authenticate, (req, res) => {
  const record = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id);

  if (!record) {
    return res.status(404).json({ error: 'Record not found' });
  }

  // Delete the image file from disk
  if (record.image_filename) {
    const imagePath = path.join(UPLOADS_DIR, record.image_filename);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  db.prepare('DELETE FROM records WHERE id = ?').run(req.params.id);
  res.json({ message: 'Record deleted successfully' });
});

// ─────────────────────────────────────────────
// Routes: Birth Records
// ─────────────────────────────────────────────

// GET /api/birth-records
app.get('/api/birth-records', authenticate, (req, res) => {
  const { query = '', limit = 50, offset = 0 } = req.query;
  let sql = 'SELECT * FROM birth_records WHERE 1=1';
  const params = [];
  if (query) {
    sql += ' AND (name_of_child LIKE ? OR lcr_number LIKE ? OR place_of_birth LIKE ?)';
    const q = `%${query}%`;
    params.push(q, q, q);
  }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  const rows = db.prepare(sql).all(...params);
  res.json({ records: rows, total: rows.length });
});

// POST /api/birth-records
app.post('/api/birth-records', authenticate, (req, res) => {
  const {
    lcr_number, date_of_registration, name_of_child, sex,
    date_of_birth, place_of_birth, type_of_birth, order: birthOrder,
    mother_name, mother_age, mother_nationality, mother_religion,
    father_name, father_age, father_nationality, father_religion,
    municipality_province, remarks
  } = req.body;

  if (!name_of_child) {
    return res.status(400).json({ error: 'Name of child is required' });
  }

  const result = db.prepare(`
    INSERT INTO birth_records
      (lcr_number, date_of_registration, name_of_child, sex, date_of_birth, place_of_birth, type_of_birth, "order",
       mother_name, mother_age, mother_nationality, mother_religion,
       father_name, father_age, father_nationality, father_religion, municipality_province, remarks, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    lcr_number || null, date_of_registration || null, name_of_child, sex || null,
    date_of_birth || null, place_of_birth || null, type_of_birth || null, birthOrder || null,
    mother_name || null, mother_age || null, mother_nationality || null, mother_religion || null,
    father_name || null, father_age || null, father_nationality || null, father_religion || null,
    municipality_province || null, remarks || null, req.user.id
  );

  const newRecord = db.prepare('SELECT * FROM birth_records WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newRecord);
});

// ─────────────────────────────────────────────
// Routes: Death Records
// ─────────────────────────────────────────────

// GET /api/death-records
app.get('/api/death-records', authenticate, (req, res) => {
  const { query = '', limit = 50, offset = 0 } = req.query;
  let sql = 'SELECT * FROM death_records WHERE 1=1';
  const params = [];
  if (query) {
    sql += ' AND (name_of_deceased LIKE ? OR lcr_number LIKE ? OR place_of_death LIKE ?)';
    const q = `%${query}%`;
    params.push(q, q, q);
  }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  const rows = db.prepare(sql).all(...params);
  res.json({ records: rows, total: rows.length });
});

// POST /api/death-records
app.post('/api/death-records', authenticate, (req, res) => {
  const {
    lcr_number, date_of_registration, name_of_deceased, sex,
    date_of_death, place_of_death, cause_of_death, age_at_death,
    civil_status, nationality, religion, occupation,
    mother_name, father_name,
    informant_name, informant_relationship, remarks
  } = req.body;

  if (!name_of_deceased) {
    return res.status(400).json({ error: 'Name of deceased is required' });
  }

  const result = db.prepare(`
    INSERT INTO death_records
      (lcr_number, date_of_registration, name_of_deceased, sex, date_of_death, place_of_death,
       cause_of_death, age_at_death, civil_status, nationality, religion, occupation,
       mother_name, father_name, informant_name, informant_relationship, remarks, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    lcr_number || null, date_of_registration || null, name_of_deceased, sex || null,
    date_of_death || null, place_of_death || null, cause_of_death || null, age_at_death || null,
    civil_status || null, nationality || null, religion || null, occupation || null,
    mother_name || null, father_name || null,
    informant_name || null, informant_relationship || null, remarks || null, req.user.id
  );

  const newRecord = db.prepare('SELECT * FROM death_records WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newRecord);
});

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'LCR Server is running', version: '1.0.0' });
});

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     LCR Records Management Server        ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`✅ Server running at http://${HOST}:${PORT}`);
  console.log(`📱 Mobile app should connect to: http://172.16.11.220:${PORT}`);
  console.log(`📁 Uploads saved to: ${UPLOADS_DIR}`);
  console.log(`🗄️  Database: ${DB_PATH}`);
  console.log('');
  console.log('🔑 Default Accounts:');
  console.log('   admin / admin123  (full access)');
  console.log('   staff / staff123  (limited access)');
  console.log('');
});
