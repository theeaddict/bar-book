import { pool } from './src/db';

async function run() {
  const client = await pool.connect();
  try {
    // Check existing products
    const { rows: products } = await client.query('SELECT DISTINCT tenant_id FROM public.products');
    console.log('Tenant IDs found in products:', products);

    // Check admin user
    const { rows: admins } = await client.query("SELECT id, tenant_id, username FROM public.users WHERE username = 'admin'");
    console.log('Admin user:', admins[0]);

    if (products.length > 0 && admins.length > 0) {
      const oldTenantId = products[0].tenant_id;
      const adminId = admins[0].id;
      
      console.log(`Updating admin user to use old tenant_id: ${oldTenantId}`);
      await client.query('UPDATE public.users SET tenant_id = $1 WHERE id = $2', [oldTenantId, adminId]);
      console.log('Successfully updated! The user needs to log out and log back in to get the new token.');
    } else {
      console.log('No existing products found, or no admin user found.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
