// config/database.js
const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'quanlyduonglao',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection
connection.getConnection((err, conn) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    // Không exit ở đây, để server vẫn chạy (cho dev)
  } else {
    console.log('✅ Database connected successfully!');
    conn.release(); // Trả connection về pool
  }
});

// Export promise pool
const promisePool = connection.promise();
module.exports = promisePool;