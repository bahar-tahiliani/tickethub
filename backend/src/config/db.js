const mysql = require('mysql2/promise');
require('dotenv').config();

// Central connection pool. Using a pool (rather than one connection) lets us
// run concurrent, isolated transactions safely - this is what makes the
// seat-hold locking logic in seatHoldService.js correct under concurrency.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tickethub',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

module.exports = pool;
