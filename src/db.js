const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

const sslConfig = {
  rejectUnauthorized: true
};

if (process.env.DB_SSL_CA) {
  sslConfig.ca = fs.readFileSync(process.env.DB_SSL_CA);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'codevector_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
