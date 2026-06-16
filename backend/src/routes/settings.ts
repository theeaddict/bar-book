import { Router } from 'express';
import { z } from 'zod';
import { withTenant } from '../db';
import { asyncHandler } from '../index';

const router = Router();

const SettingsSchema = z.object({
  key: z.string(),
  value: z.string(),
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get('/', asyncHandler(async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId || !UUID_REGEX.test(tenantId)) {
    return res.status(400).json({ error: 'Invalid or missing x-tenant-id header' });
  }
  const rows = await withTenant(tenantId, async (client) => {
    const { rows } = await client.query('SELECT key, value FROM settings WHERE tenant_id = $1', [tenantId]);
    return rows;
  });
  
  const settings = rows.reduce((acc: any, row: any) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
  
  res.json(settings);
}));

router.post('/', asyncHandler(async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId || !UUID_REGEX.test(tenantId)) {
    return res.status(400).json({ error: 'Invalid or missing x-tenant-id header' });
  }
  const { key, value } = SettingsSchema.parse(req.body);
  
  // Require admin to change settings
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  await withTenant(tenantId, async (client) => {
    await client.query(
      `INSERT INTO settings (key, value, tenant_id) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [key, value, tenantId]
    );
  });

  res.json({ message: 'Settings saved successfully' });
}));

export default router;