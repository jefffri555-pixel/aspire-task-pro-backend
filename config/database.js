const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_DATABASE || 'aspire_task_pro',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

let connectionFailed = false;

const query = async (text, params) => {
  if (connectionFailed) {
    return { rows: [], rowCount: 0 };
  }
  try {
    return await pool.query(text, params);
  } catch (err) {
    const isConnectionError = 
      err.code === '28P01' || // Auth failed
      err.code === '28000' || // Invalid authorization
      err.code === 'ECONNREFUSED' ||
      err.code === 'ENOTFOUND' ||
      err.code === 'ETIMEDOUT' ||
      err.message.includes('connect') ||
      err.message.includes('authentication') ||
      err.message.includes('password');

    if (isConnectionError) {
      connectionFailed = true;
      console.error('Database connection failure detected. Switching to mock mode. Error:', err.message);
      return { rows: [], rowCount: 0 };
    }
    throw err;
  }
};

pool.on('connect', () => {
  console.log('Database pool connected successfully.');
  connectionFailed = false;
});

pool.on('error', (err) => {
  console.error('Unexpected database connection error:', err.message);
  connectionFailed = true;
});

module.exports = {
  query,
  isConnectionFailed: () => connectionFailed,
  setConnectionFailed: (val) => { connectionFailed = val; },
  pool
};
