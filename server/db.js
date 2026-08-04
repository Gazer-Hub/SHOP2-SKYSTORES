const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_FILE = process.env.DB_FILE || path.join(__dirname, '..', 'payments.db');
const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    amount INTEGER,
    currency TEXT,
    status TEXT,
    payer TEXT,
    raw TEXT,
    created_at TEXT
  )`);
});

function insertPayment(p) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT OR REPLACE INTO payments
      (id, amount, currency, status, payer, raw, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [p.id, p.amount, p.currency, p.status, p.payer, p.raw, p.created_at], function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

function listPayments(limit = 100) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT id, amount, currency, status, payer, created_at FROM payments ORDER BY created_at DESC LIMIT ?`, [limit], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = { insertPayment, listPayments };
