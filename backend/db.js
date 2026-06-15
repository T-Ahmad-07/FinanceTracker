const { Pool } = require('pg');
require('dotenv').config();

// Use connection string from environment or default to local Homebrew PostgreSQL
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/finance_tracker';

const pool = new Pool({
  connectionString
});

pool.on('connect', () => {
  console.log('Connected to the PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
