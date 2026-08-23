const pool = require('../config/db');

async function createUser({ name, email, passwordHash, role }) {
  const [result] = await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
    [name, email, passwordHash, role]
  );
  return result.insertId;
}

async function findByEmail(email) {
  const [rows] = await pool.query(`SELECT * FROM users WHERE email = ?`, [email]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, created_at FROM users WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function listOrganisers() {
  const [rows] = await pool.query(
    `SELECT id, name, email, created_at FROM users WHERE role = 'organiser' ORDER BY created_at DESC`
  );
  return rows;
}

async function countByRole(role) {
  const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM users WHERE role = ?`, [role]);
  return rows[0].count;
}

module.exports = { createUser, findByEmail, findById, listOrganisers, countByRole };
