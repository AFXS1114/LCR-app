require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────
const PORT = 3000;
const HOST = '0.0.0.0';
const JWT_SECRET = 'lcr-app-secret-key-change-in-production';
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DB_PATH = path.join(__dirname, 'lcr.db');

// Ensure directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ─────────────────────────────────────────────
// Database Driver Wrapper (Support serverless Turso / local SQLite)
// ─────────────────────────────────────────────
const isTurso = !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
let dbClient;

if (isTurso) {
  console.log('Connecting to Turso Cloud DB (Serverless Client)...');
  const { createClient } = require('@libsql/client');
  dbClient = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
} else {
  console.log('Connecting to local SQLite database (better-sqlite3)...');
  const Database = require('better-sqlite3');
  const localDb = new Database(DB_PATH);
  localDb.pragma('journal_mode = WAL');

  // Shim the Turso client API for local better-sqlite3
  dbClient = {
    async execute(queryObj) {
      const sql = typeof queryObj === 'string' ? queryObj : queryObj.sql;
      const args = typeof queryObj === 'string' ? [] : (queryObj.args || []);
      
      const stmt = localDb.prepare(sql);
      
      // Determine if query is reading (SELECT) or writing
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
      
      if (isSelect) {
        const rows = stmt.all(...args);
        return { rows };
      } else {
        const info = stmt.run(...args);
        return {
          lastInsertRowid: info.lastInsertRowid,
          rowsAffected: info.changes
        };
      }
    },
    async executeMultiple(queries) {
      const results = [];
      const transaction = localDb.transaction((qs) => {
        for (const q of qs) {
          const sql = typeof q === 'string' ? q : q.sql;
          const args = typeof q === 'string' ? [] : (q.args || []);
          results.push(localDb.prepare(sql).run(...args));
        }
      });
      transaction(queries);
      return results;
    }
  };
}

// Initialize tables asynchronously
async function initDb() {
  try {
    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'staff',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await dbClient.execute(`
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
    `);

    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS birth_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lcr_number TEXT,
        date_of_registration TEXT,
        page_no TEXT,
        book_no TEXT,
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
        date_of_marriage_of_parents TEXT,
        place_of_marriage_of_parents TEXT,
        municipality_province TEXT,
        remarks TEXT,
        created_by INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (created_by) REFERENCES users(id)
      );
    `);

    // Migrations for newly added birth fields
    const alterCols = [
      'ALTER TABLE birth_records ADD COLUMN page_no TEXT',
      'ALTER TABLE birth_records ADD COLUMN book_no TEXT',
      'ALTER TABLE birth_records ADD COLUMN date_of_marriage_of_parents TEXT',
      'ALTER TABLE birth_records ADD COLUMN place_of_marriage_of_parents TEXT',
    ];
    for (const alterSql of alterCols) {
      try { await dbClient.execute(alterSql); } catch (e) { /* ignore if already exists */ }
    }

    await dbClient.execute(`
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

    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        designation TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS form1a_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        birth_record_id INTEGER,
        requestee TEXT,
        purpose TEXT,
        prn TEXT,
        verified_by TEXT,
        mcr_name TEXT,
        amount_paid TEXT,
        or_number TEXT,
        date_paid TEXT,
        generated_date TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (birth_record_id) REFERENCES birth_records(id)
      );
    `);

    // Seed default settings passcode if it doesn't exist
    const passcodeCheck = await dbClient.execute({
      sql: 'SELECT value FROM settings WHERE key = ?',
      args: ['settings_passcode']
    });

    if (passcodeCheck.rows.length === 0) {
      await dbClient.execute({
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
        args: ['settings_passcode', '1234']
      });
      console.log('✅ Default settings passcode created (1234).');
    }

    // Seed default users if they don't exist
    const userCheck = await dbClient.execute({
      sql: 'SELECT id FROM users WHERE username = ?',
      args: ['admin']
    });

    if (userCheck.rows.length === 0) {
      await dbClient.execute({
        sql: 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        args: ['admin', 'admin123', 'admin']
      });
      await dbClient.execute({
        sql: 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        args: ['staff', 'staff123', 'staff']
      });
      console.log('✅ Default users created.');
    }
  } catch (err) {
    console.error('❌ Error during database schema initialization:', err);
  }
}

// Kickoff DB initialization
initDb();

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
app.use('/uploads', express.static(UPLOADS_DIR));

// ─────────────────────────────────────────────
// Routes: Settings & Passcode
// ─────────────────────────────────────────────

// POST /api/settings/verify-passcode
app.post('/api/settings/verify-passcode', authenticate, async (req, res) => {
  const { passcode } = req.body;
  if (!passcode) return res.status(400).json({ error: 'Passcode is required' });

  try {
    const result = await dbClient.execute({
      sql: 'SELECT value FROM settings WHERE key = ?',
      args: ['settings_passcode']
    });
    const storedPasscode = result.rows[0]?.value || '1234';

    if (String(passcode).trim() === String(storedPasscode).trim()) {
      res.json({ success: true, message: 'Passcode verified' });
    } else {
      res.status(401).json({ error: 'Incorrect passcode' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/passcode
app.put('/api/settings/passcode', authenticate, async (req, res) => {
  const { currentPasscode, newPasscode } = req.body;
  if (!currentPasscode || !newPasscode) {
    return res.status(400).json({ error: 'Current passcode and new passcode are required' });
  }

  try {
    const result = await dbClient.execute({
      sql: 'SELECT value FROM settings WHERE key = ?',
      args: ['settings_passcode']
    });
    const storedPasscode = result.rows[0]?.value || '1234';

    if (String(currentPasscode).trim() !== String(storedPasscode).trim()) {
      return res.status(401).json({ error: 'Current passcode is incorrect' });
    }

    await dbClient.execute({
      sql: 'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\')) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at',
      args: ['settings_passcode', String(newPasscode).trim()]
    });

    res.json({ success: true, message: 'Passcode updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/office
app.get('/api/settings/office', authenticate, async (req, res) => {
  try {
    const result = await dbClient.execute("SELECT key, value FROM settings WHERE key IN ('mcr_name', 'municipality', 'province')");
    const info = {};
    for (const r of result.rows) {
      info[r.key] = r.value;
    }
    res.json({
      mcr_name: info.mcr_name || '',
      municipality: info.municipality || '',
      province: info.province || '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/office
app.put('/api/settings/office', authenticate, async (req, res) => {
  const { mcr_name, municipality, province } = req.body;
  try {
    const items = [
      ['mcr_name', mcr_name || ''],
      ['municipality', municipality || ''],
      ['province', province || ''],
    ];

    for (const [key, value] of items) {
      await dbClient.execute({
        sql: 'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\')) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at',
        args: [key, String(value).trim()]
      });
    }

    res.json({ success: true, message: 'Office information & MCR updated in database' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// Routes: Employees Management
// ─────────────────────────────────────────────

// GET /api/employees
app.get('/api/employees', authenticate, async (req, res) => {
  try {
    const result = await dbClient.execute('SELECT * FROM employees ORDER BY id ASC');
    res.json({ employees: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/employees (Upsert by name to prevent duplicates)
app.post('/api/employees', authenticate, async (req, res) => {
  const { name, designation } = req.body;
  if (!name || !designation) {
    return res.status(400).json({ error: 'Name and designation are required' });
  }

  try {
    const trimmedName = String(name).trim();
    const trimmedDesig = String(designation).trim();

    const existing = await dbClient.execute({
      sql: 'SELECT * FROM employees WHERE LOWER(name) = LOWER(?)',
      args: [trimmedName]
    });

    if (existing.rows && existing.rows.length > 0) {
      const existingId = existing.rows[0].id;
      await dbClient.execute({
        sql: 'UPDATE employees SET name=?, designation=? WHERE id=?',
        args: [trimmedName, trimmedDesig, existingId]
      });
      const updated = (await dbClient.execute({
        sql: 'SELECT * FROM employees WHERE id = ?',
        args: [existingId]
      })).rows[0];
      return res.json(updated);
    }

    const result = await dbClient.execute({
      sql: 'INSERT INTO employees (name, designation) VALUES (?, ?)',
      args: [trimmedName, trimmedDesig]
    });

    const newEmp = (await dbClient.execute({
      sql: 'SELECT * FROM employees WHERE id = ?',
      args: [Number(result.lastInsertRowid)]
    })).rows[0];

    res.status(201).json(newEmp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/employees/:id
app.put('/api/employees/:id', authenticate, async (req, res) => {
  const { name, designation } = req.body;
  if (!name || !designation) {
    return res.status(400).json({ error: 'Name and designation are required' });
  }

  try {
    await dbClient.execute({
      sql: 'UPDATE employees SET name=?, designation=? WHERE id=?',
      args: [String(name).trim(), String(designation).trim(), req.params.id]
    });
    const updatedEmp = (await dbClient.execute({
      sql: 'SELECT * FROM employees WHERE id = ?',
      args: [req.params.id]
    })).rows[0];
    res.json(updatedEmp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/employees/:id
app.delete('/api/employees/:id', authenticate, async (req, res) => {
  try {
    await dbClient.execute({
      sql: 'DELETE FROM employees WHERE id = ?',
      args: [req.params.id]
    });
    res.json({ success: true, message: 'Employee deleted from database' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// Routes: Auth
// ─────────────────────────────────────────────

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const result = await dbClient.execute({
      sql: 'SELECT * FROM users WHERE username = ? AND password = ?',
      args: [username, password]
    });
    
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: Number(user.id), username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: Number(user.id), username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// Routes: Stats (Dashboard)
// ─────────────────────────────────────────────

// GET /api/stats
app.get('/api/stats', authenticate, async (req, res) => {
  try {
    // Count across all record types
    const scannedCount   = (await dbClient.execute('SELECT COUNT(*) as count FROM records')).rows[0].count;
    const birthCount     = (await dbClient.execute('SELECT COUNT(*) as count FROM birth_records')).rows[0].count;
    const deathCount     = (await dbClient.execute('SELECT COUNT(*) as count FROM death_records')).rows[0].count;
    const totalRecords   = Number(scannedCount) + Number(birthCount) + Number(deathCount);

    const scannedToday   = (await dbClient.execute("SELECT COUNT(*) as count FROM records WHERE date(created_at) = date('now')")).rows[0].count;
    const birthToday     = (await dbClient.execute("SELECT COUNT(*) as count FROM birth_records WHERE date(created_at) = date('now')")).rows[0].count;
    const deathToday     = (await dbClient.execute("SELECT COUNT(*) as count FROM death_records WHERE date(created_at) = date('now')")).rows[0].count;
    const todayRecords   = Number(scannedToday) + Number(birthToday) + Number(deathToday);

    const categories = (await dbClient.execute('SELECT COUNT(DISTINCT category) as count FROM records WHERE category IS NOT NULL AND category != ""')).rows[0].count;

    res.json({
      totalRecords,
      scannedRecords: Number(scannedCount),
      birthRecords:   Number(birthCount),
      deathRecords:   Number(deathCount),
      todayRecords,
      totalCategories: Number(categories),
      syncStatus: 'Online',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// Routes: Unified Search
// ─────────────────────────────────────────────

// GET /api/search?query=&limit=
app.get('/api/search', authenticate, async (req, res) => {
  const { query = '', limit = 500 } = req.query;
  const q = `%${query}%`;

  try {
    const birthSql = query
      ? { sql: `SELECT *, 'birth' as record_type FROM birth_records WHERE name_of_child LIKE ? OR lcr_number LIKE ? ORDER BY created_at DESC LIMIT ?`, args: [q, q, Number(limit)] }
      : { sql: `SELECT *, 'birth' as record_type FROM birth_records ORDER BY created_at DESC LIMIT ?`, args: [Number(limit)] };

    const deathSql = query
      ? { sql: `SELECT *, 'death' as record_type FROM death_records WHERE name_of_deceased LIKE ? OR lcr_number LIKE ? ORDER BY created_at DESC LIMIT ?`, args: [q, q, Number(limit)] }
      : { sql: `SELECT *, 'death' as record_type FROM death_records ORDER BY created_at DESC LIMIT ?`, args: [Number(limit)] };

    const [birthResult, deathResult] = await Promise.all([
      dbClient.execute(birthSql),
      dbClient.execute(deathSql),
    ]);

    const merged = [...birthResult.rows, ...deathResult.rows].sort((a, b) => {
      const ta = a.created_at ? new Date(String(a.created_at)).getTime() : 0;
      const tb = b.created_at ? new Date(String(b.created_at)).getTime() : 0;
      return tb - ta;
    });

    res.json({ records: merged, total: merged.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// Routes: General Records (PUT & DELETE included)
// ─────────────────────────────────────────────

// GET /api/records
app.get('/api/records', authenticate, async (req, res) => {
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

  try {
    const result = await dbClient.execute({ sql, args: params });
    const records = result.rows;

    const host = req.get('host');
    const protocol = req.protocol;
    const enriched = records.map(r => ({
      ...r,
      imageUrl: r.image_filename
        ? `${protocol}://${host}/uploads/${r.image_filename}`
        : null,
    }));

    res.json({ records: enriched, total: enriched.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/records/:id
app.put('/api/records/:id', authenticate, upload.single('image'), async (req, res) => {
  const { name, serialNumber, pageNumber, category, description, tags, date } = req.body;
  const id = req.params.id;

  try {
    let sql = `UPDATE records SET name=?, serial_number=?, page_number=?, category=?, description=?, tags=?, date=?`;
    const params = [name, serialNumber || null, pageNumber || null, category || null, description || null, tags || null, date || null];

    if (req.file) {
      sql += `, image_filename=?`;
      params.push(req.file.filename);
    }

    sql += ` WHERE id=?`;
    params.push(id);

    await dbClient.execute({ sql, args: params });
    res.json({ success: true, message: 'Record updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/records/:id
app.delete('/api/records/:id', authenticate, async (req, res) => {
  try {
    await dbClient.execute({
      sql: 'DELETE FROM records WHERE id = ?',
      args: [req.params.id]
    });
    res.json({ success: true, message: 'Record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/records
app.post('/api/records', authenticate, upload.single('image'), async (req, res) => {
  const { name, serialNumber, pageNumber, category, description, tags, date } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const imageFilename = req.file ? req.file.filename : null;

  try {
    const result = await dbClient.execute({
      sql: `INSERT INTO records (name, serial_number, page_number, category, description, tags, image_filename, date, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        name,
        serialNumber || null,
        pageNumber || null,
        category || null,
        description || null,
        tags || null,
        imageFilename,
        date || null,
        req.user.id
      ]
    });

    const newRecord = (await dbClient.execute({
      sql: 'SELECT * FROM records WHERE id = ?',
      args: [Number(result.lastInsertRowid)]
    })).rows[0];

    res.status(201).json(newRecord);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// Routes: Birth Records (PUT & DELETE included)
// ─────────────────────────────────────────────

// GET /api/birth-records
app.get('/api/birth-records', authenticate, async (req, res) => {
  const { query = '', limit = 500, offset = 0 } = req.query;
  let sql = 'SELECT * FROM birth_records WHERE 1=1';
  const params = [];
  
  if (query) {
    sql += ' AND (name_of_child LIKE ? OR lcr_number LIKE ? OR place_of_birth LIKE ?)';
    const q = `%${query}%`;
    params.push(q, q, q);
  }
  
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  
  try {
    const result = await dbClient.execute({ sql, args: params });
    res.json({ records: result.rows, total: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/birth-records/:id
app.get('/api/birth-records/:id', authenticate, async (req, res) => {
  try {
    const result = await dbClient.execute({
      sql: 'SELECT * FROM birth_records WHERE id = ?',
      args: [req.params.id]
    });
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Birth record not found' });
    }
    res.json({ record: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/birth-records/:id
app.put('/api/birth-records/:id', authenticate, async (req, res) => {
  const id = req.params.id;
  const {
    lcr_number, date_of_registration, page_no, book_no, name_of_child, sex,
    date_of_birth, place_of_birth, type_of_birth, order: birthOrder,
    mother_name, mother_age, mother_nationality, mother_religion,
    father_name, father_age, father_nationality, father_religion,
    date_of_marriage_of_parents, place_of_marriage_of_parents,
    municipality_province, remarks
  } = req.body;

  if (!name_of_child) return res.status(400).json({ error: 'Name of child is required' });

  try {
    await dbClient.execute({
      sql: `UPDATE birth_records SET
              lcr_number=?, date_of_registration=?, page_no=?, book_no=?, name_of_child=?, sex=?,
              date_of_birth=?, place_of_birth=?, type_of_birth=?, "order"=?,
              mother_name=?, mother_age=?, mother_nationality=?, mother_religion=?,
              father_name=?, father_age=?, father_nationality=?, father_religion=?,
              date_of_marriage_of_parents=?, place_of_marriage_of_parents=?,
              municipality_province=?, remarks=?
            WHERE id=?`,
      args: [
        lcr_number || null, date_of_registration || null, page_no || null, book_no || null, name_of_child, sex || null,
        date_of_birth || null, place_of_birth || null, type_of_birth || null, birthOrder || null,
        mother_name || null, mother_age || null, mother_nationality || null, mother_religion || null,
        father_name || null, father_age || null, father_nationality || null, father_religion || null,
        date_of_marriage_of_parents || null, place_of_marriage_of_parents || null,
        municipality_province || null, remarks || null, id
      ]
    });
    res.json({ success: true, message: 'Birth record updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/birth-records/:id
app.delete('/api/birth-records/:id', authenticate, async (req, res) => {
  try {
    await dbClient.execute({
      sql: 'DELETE FROM birth_records WHERE id = ?',
      args: [req.params.id]
    });
    res.json({ success: true, message: 'Birth record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/birth-records
app.post('/api/birth-records', authenticate, async (req, res) => {
  const {
    lcr_number, date_of_registration, page_no, book_no, name_of_child, sex,
    date_of_birth, place_of_birth, type_of_birth, order: birthOrder,
    mother_name, mother_age, mother_nationality, mother_religion,
    father_name, father_age, father_nationality, father_religion,
    date_of_marriage_of_parents, place_of_marriage_of_parents,
    municipality_province, remarks
  } = req.body;

  if (!name_of_child) {
    return res.status(400).json({ error: 'Name of child is required' });
  }

  try {
    const result = await dbClient.execute({
      sql: `INSERT INTO birth_records
              (lcr_number, date_of_registration, page_no, book_no, name_of_child, sex, date_of_birth, place_of_birth, type_of_birth, "order",
               mother_name, mother_age, mother_nationality, mother_religion,
               father_name, father_age, father_nationality, father_religion,
               date_of_marriage_of_parents, place_of_marriage_of_parents, municipality_province, remarks, created_by)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        lcr_number || null, date_of_registration || null, page_no || null, book_no || null, name_of_child, sex || null,
        date_of_birth || null, place_of_birth || null, type_of_birth || null, birthOrder || null,
        mother_name || null, mother_age || null, mother_nationality || null, mother_religion || null,
        father_name || null, father_age || null, father_nationality || null, father_religion || null,
        date_of_marriage_of_parents || null, place_of_marriage_of_parents || null,
        municipality_province || null, remarks || null, req.user.id
      ]
    });

    const newRecord = (await dbClient.execute({
      sql: 'SELECT * FROM birth_records WHERE id = ?',
      args: [Number(result.lastInsertRowid)]
    })).rows[0];

    res.status(201).json(newRecord);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// Routes: Death Records (PUT & DELETE included)
// ─────────────────────────────────────────────

// GET /api/death-records
app.get('/api/death-records', authenticate, async (req, res) => {
  const { query = '', limit = 500, offset = 0 } = req.query;
  let sql = 'SELECT * FROM death_records WHERE 1=1';
  const params = [];
  
  if (query) {
    sql += ' AND (name_of_deceased LIKE ? OR lcr_number LIKE ? OR place_of_death LIKE ?)';
    const q = `%${query}%`;
    params.push(q, q, q);
  }
  
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  
  try {
    const result = await dbClient.execute({ sql, args: params });
    res.json({ records: result.rows, total: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/death-records/:id
app.put('/api/death-records/:id', authenticate, async (req, res) => {
  const id = req.params.id;
  const {
    lcr_number, date_of_registration, name_of_deceased, sex,
    date_of_death, place_of_death, cause_of_death, age_at_death,
    civil_status, nationality, religion, occupation,
    mother_name, father_name,
    informant_name, informant_relationship, remarks
  } = req.body;

  if (!name_of_deceased) return res.status(400).json({ error: 'Name of deceased is required' });

  try {
    await dbClient.execute({
      sql: `UPDATE death_records SET
              lcr_number=?, date_of_registration=?, name_of_deceased=?, sex=?,
              date_of_death=?, place_of_death=?, cause_of_death=?, age_at_death=?,
              civil_status=?, nationality=?, religion=?, occupation=?,
              mother_name=?, father_name=?, informant_name=?, informant_relationship=?, remarks=?
            WHERE id=?`,
      args: [
        lcr_number || null, date_of_registration || null, name_of_deceased, sex || null,
        date_of_death || null, place_of_death || null, cause_of_death || null, age_at_death || null,
        civil_status || null, nationality || null, religion || null, occupation || null,
        mother_name || null, father_name || null,
        informant_name || null, informant_relationship || null, remarks || null, id
      ]
    });
    res.json({ success: true, message: 'Death record updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/death-records/:id
app.delete('/api/death-records/:id', authenticate, async (req, res) => {
  try {
    await dbClient.execute({
      sql: 'DELETE FROM death_records WHERE id = ?',
      args: [req.params.id]
    });
    res.json({ success: true, message: 'Death record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/death-records
app.post('/api/death-records', authenticate, async (req, res) => {
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

  try {
    const result = await dbClient.execute({
      sql: `INSERT INTO death_records
              (lcr_number, date_of_registration, name_of_deceased, sex, date_of_death, place_of_death,
               cause_of_death, age_at_death, civil_status, nationality, religion, occupation,
               mother_name, father_name, informant_name, informant_relationship, remarks, created_by)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        lcr_number || null, date_of_registration || null, name_of_deceased, sex || null,
        date_of_death || null, place_of_death || null, cause_of_death || null, age_at_death || null,
        civil_status || null, nationality || null, religion || null, occupation || null,
        mother_name || null, father_name || null,
        informant_name || null, informant_relationship || null, remarks || null, req.user.id
      ]
    });

    const newRecord = (await dbClient.execute({
      sql: 'SELECT * FROM death_records WHERE id = ?',
      args: [Number(result.lastInsertRowid)]
    })).rows[0];

    res.status(201).json(newRecord);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// Routes: Form 1A Generated Records
// ─────────────────────────────────────────────

// GET /api/form1a-records
app.get('/api/form1a-records', authenticate, async (req, res) => {
  try {
    const result = await dbClient.execute(`
      SELECT f.*, b.name_of_child, b.lcr_number as record_lcr_number 
      FROM form1a_records f
      LEFT JOIN birth_records b ON f.birth_record_id = b.id
      ORDER BY f.created_at DESC
      LIMIT 100
    `);
    res.json({ records: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/form1a-records (Upsert: by OR number first, then by birth_record_id)
app.post('/api/form1a-records', authenticate, async (req, res) => {
  const {
    birth_record_id, requestee, purpose, prn, verified_by,
    mcr_name, amount_paid, or_number, date_paid, generated_date
  } = req.body;

  const updateFields = [
    requestee || null, purpose || null, prn || null, verified_by || null,
    mcr_name || null, amount_paid || null, or_number || null,
    date_paid || null, generated_date || null
  ];

  try {
    // 1. If OR number is provided, upsert by OR number (globally unique receipt)
    if (or_number && String(or_number).trim() !== '') {
      const byOrNum = await dbClient.execute({
        sql: 'SELECT id FROM form1a_records WHERE LOWER(or_number) = LOWER(?)',
        args: [String(or_number).trim()]
      });

      if (byOrNum.rows && byOrNum.rows.length > 0) {
        const existingId = byOrNum.rows[0].id;
        await dbClient.execute({
          sql: `UPDATE form1a_records SET
                  birth_record_id=?, requestee=?, purpose=?, prn=?, verified_by=?, mcr_name=?,
                  amount_paid=?, or_number=?, date_paid=?, generated_date=?,
                  created_at=datetime('now')
                WHERE id=?`,
          args: [
            birth_record_id || null, ...updateFields, existingId
          ]
        });
        const updated = (await dbClient.execute({
          sql: 'SELECT * FROM form1a_records WHERE id = ?',
          args: [existingId]
        })).rows[0];
        return res.status(200).json({ ...updated, _upserted: 'or_number' });
      }
    }

    // 2. Fallback: upsert by birth_record_id (same person re-printed)
    if (birth_record_id) {
      const byBirthId = await dbClient.execute({
        sql: 'SELECT id FROM form1a_records WHERE birth_record_id = ?',
        args: [birth_record_id]
      });

      if (byBirthId.rows && byBirthId.rows.length > 0) {
        const existingId = byBirthId.rows[0].id;
        await dbClient.execute({
          sql: `UPDATE form1a_records SET
                  requestee=?, purpose=?, prn=?, verified_by=?, mcr_name=?,
                  amount_paid=?, or_number=?, date_paid=?, generated_date=?,
                  created_at=datetime('now')
                WHERE id=?`,
          args: [...updateFields, existingId]
        });
        const updated = (await dbClient.execute({
          sql: 'SELECT * FROM form1a_records WHERE id = ?',
          args: [existingId]
        })).rows[0];
        return res.status(200).json({ ...updated, _upserted: 'birth_record_id' });
      }
    }

    // 3. No match — insert new record
    const result = await dbClient.execute({
      sql: `INSERT INTO form1a_records
              (birth_record_id, requestee, purpose, prn, verified_by, mcr_name, amount_paid, or_number, date_paid, generated_date)
            VALUES (?,?,?,?,?,?,?,?,?,?)`,
      args: [
        birth_record_id || null, requestee || null, purpose || null, prn || null,
        verified_by || null, mcr_name || null, amount_paid || null,
        or_number || null, date_paid || null, generated_date || null
      ]
    });

    const newRecord = (await dbClient.execute({
      sql: 'SELECT * FROM form1a_records WHERE id = ?',
      args: [Number(result.lastInsertRowid)]
    })).rows[0];

    res.status(201).json(newRecord);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/form1a-records/:id (Delete individual issuance record)
app.delete('/api/form1a-records/:id', authenticate, async (req, res) => {
  try {
    await dbClient.execute({
      sql: 'DELETE FROM form1a_records WHERE id = ?',
      args: [req.params.id]
    });
    res.json({ success: true, message: 'Form 1A issuance record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/form1a-records (Empty all issuance records)
app.delete('/api/form1a-records', authenticate, async (req, res) => {
  try {
    await dbClient.execute('DELETE FROM form1a_records');
    res.json({ success: true, message: 'All Form 1A issuance records cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
if (!process.env.VERCEL) {
  app.listen(PORT, HOST, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║     LCR Records Management Server        ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`✅ Server running at http://${HOST}:${PORT}`);
    console.log(`📁 Uploads saved to: ${UPLOADS_DIR}`);
    console.log(`🗄️  Database: ${DB_PATH}`);
    console.log('');
  });
}

module.exports = app;
