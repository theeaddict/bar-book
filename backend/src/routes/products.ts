// src/routes/products.ts
import { Router } from 'express';
import { z } from 'zod';
import { withTenant, auditLog } from '../db';

const router = Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validateTenantId(tenantId: string): boolean {
  return !!tenantId && UUID_REGEX.test(tenantId);
}

const ProductSchema = z.object({
  id: z.string(),
  group_name: z.string().min(1),
  name: z.string().min(1),
  buy_price: z.number().int().nonnegative(),
  sell_price: z.number().int().nonnegative(),
});

// GET /products
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!validateTenantId(tenantId)) {
      return res.status(400).json({ error: 'Invalid or missing x-tenant-id header' });
    }

    const products = await withTenant(tenantId, async (client) => {
      const { rows } = await client.query(
        'SELECT id, group_name, name, buy_price, sell_price FROM products ORDER BY group_name, name'
      );
      return rows;
    });

    res.json(products);
  } catch (error) {
    next(error);
  }
});

// POST /products
router.post('/', async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!validateTenantId(tenantId)) {
      return res.status(400).json({ error: 'Invalid or missing x-tenant-id header' });
    }

    const data = ProductSchema.parse(req.body);

    await withTenant(tenantId, async (client) => {
      await client.query(
        `INSERT INTO products (id, tenant_id, group_name, name, buy_price, sell_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [data.id, tenantId, data.group_name, data.name, data.buy_price, data.sell_price]
      );
      await auditLog(client, tenantId, req.user?.username || 'unknown', 'CREATE', 'products', data.id, data);
    });

    res.status(201).json({ message: 'Product created successfully' });
  } catch (error) {
    next(error);
  }
});

// PUT /products/:id
router.put('/:id', async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!validateTenantId(tenantId)) {
      return res.status(400).json({ error: 'Invalid or missing x-tenant-id header' });
    }

    const { id } = req.params;
    const data = ProductSchema.omit({ id: true }).parse(req.body);

    await withTenant(tenantId, async (client) => {
      await client.query(
        `UPDATE products SET group_name = $1, name = $2, buy_price = $3, sell_price = $4
         WHERE id = $5 AND tenant_id = $6`,
        [data.group_name, data.name, data.buy_price, data.sell_price, id, tenantId]
      );
      await auditLog(client, tenantId, req.user?.username || 'unknown', 'UPDATE', 'products', id, data);
    });

    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    next(error);
  }
});

// DELETE /products/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!validateTenantId(tenantId)) {
      return res.status(400).json({ error: 'Invalid or missing x-tenant-id header' });
    }

    const { id } = req.params;

    await withTenant(tenantId, async (client) => {
      await client.query(
        'DELETE FROM products WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
      await auditLog(client, tenantId, req.user?.username || 'unknown', 'DELETE', 'products', id, { id });
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
