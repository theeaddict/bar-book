import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'");
    for (const row of rows) {
      const schema = row.schema_name;
      console.log(`Clearing sales for schema: ${schema}`);
      await client.query(`DELETE FROM "${schema}".day_products;`);
      await client.query(`DELETE FROM "${schema}".day_kegs;`);
      await client.query(`DELETE FROM "${schema}".audit_logs;`);
    }
    console.log("All sales data cleared successfully.");
  } finally {
    client.release();
    pool.end();
  }
}
run().catch(console.error);
