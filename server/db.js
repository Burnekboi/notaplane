const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_URI,
});

pool.on('connect', () => console.log('Database connected'));
pool.on('error', (err) => console.error('Database error:', err.message));

async function connectDb() {
  const uri = process.env.SUPABASE_URI;
  if (!uri) throw new Error('SUPABASE_URI not set in .env');
  const client = await pool.connect();
  client.release();
}

function query(text, params) {
  return pool.query(text, params);
}

module.exports = { connectDb, query, pool };
