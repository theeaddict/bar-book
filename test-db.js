const { Pool } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const { rows } = await pool.query('SELECT * FROM public.users');
  console.log(rows);
  process.exit(0);
}

run().catch(console.error);
