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
    `);

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
    const totalRecords = (await dbClient.execute('SELECT COUNT(*) as count FROM records')).rows[0].count;
    const todayRecords = (await dbClient.execute("SELECT COUNT(*) as count FROM records WHERE date(created_at) = date('now')")).rows[0].count;
    const categories = (await dbClient.execute('SELECT COUNT(DISTINCT category) as count FROM records WHERE category IS NOT NULL AND category != ""')).rows[0].count;

    res.json({
      totalRecords: Number(totalRecords),
      todayRecords: Number(todayRecords),
      totalCategories: Number(categories),
      syncStatus: 'Online',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// Routes: Records
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

// GET /api/records/:id
app.get('/api/records/:id', authenticate, async (req, res) => {
  try {
    const result = await dbClient.execute({
      sql: 'SELECT * FROM records WHERE id = ?',
      args: [req.params.id]
    });
    
    const record = result.rows[0];

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
// Routes: Birth Records
// ─────────────────────────────────────────────

// GET /api/birth-records
app.get('/api/birth-records', authenticate, async (req, res) => {
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
  
  try {
    const result = await dbClient.execute({ sql, args: params });
    res.json({ records: result.rows, total: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/birth-records
app.post('/api/birth-records', authenticate, async (req, res) => {
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

  try {
    const result = await dbClient.execute({
      sql: `INSERT INTO birth_records
              (lcr_number, date_of_registration, name_of_child, sex, date_of_birth, place_of_birth, type_of_birth, "order",
               mother_name, mother_age, mother_nationality, mother_religion,
               father_name, father_age, father_nationality, father_religion, municipality_province, remarks, created_by)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        lcr_number || null, date_of_registration || null, name_of_child, sex || null,
        date_of_birth || null, place_of_birth || null, type_of_birth || null, birthOrder || null,
        mother_name || null, mother_age || null, mother_nationality || null, mother_religion || null,
        father_name || null, father_age || null, father_nationality || null, father_religion || null,
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
// Routes: Death Records
// ─────────────────────────────────────────────

// GET /api/death-records
app.get('/api/death-records', authenticate, async (req, res) => {
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
  
  try {
    const result = await dbClient.execute({ sql, args: params });
    res.json({ records: result.rows, total: result.rows.length });
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
