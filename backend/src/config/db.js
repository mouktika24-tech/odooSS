const path = require('path');
const { Pool } = require('pg');

// Load .env from the project root
require('dotenv').config({
  path: path.resolve(__dirname, '../../.env'),
});

const connectionOptions = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'stocksense_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
    }

const pool = new Pool({
  ...connectionOptions,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() AS current_time');
    console.log(
      'PostgreSQL connected successfully:',
      result.rows[0].current_time
    );
    return true;
  } catch (error) {
    console.error('PostgreSQL connection failed:', error.message);
    return false;
  }
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  testConnection,
};