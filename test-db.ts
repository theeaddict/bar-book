import { pool } from './backend/src/db';
async function run() {
  const { rows } = await pool.query('SELECT * FROM public.users');
  console.log(rows);
  process.exit(0);
}
run();
