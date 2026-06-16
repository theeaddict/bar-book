import { pool } from './src/db';
import bcrypt from 'bcrypt';

async function seed() {
  const client = await pool.connect();
  try {
    const password_hash = await bcrypt.hash('admin123', 10);
    const { rows } = await client.query(
      `INSERT INTO public.users (username, password_hash, role) 
       VALUES ('admin', $1, 'admin') 
       ON CONFLICT (username) DO NOTHING RETURNING id`,
      [password_hash]
    );
    if (rows.length > 0) {
      await client.query('UPDATE public.users SET tenant_id = id WHERE id = $1', [rows[0].id]);
    }
    console.log('Admin user created/verified: admin / admin123');
  } finally {
    client.release();
    process.exit(0);
  }
}
seed().catch(console.error);
