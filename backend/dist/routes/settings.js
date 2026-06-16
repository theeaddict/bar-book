"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const index_1 = require("../index");
const router = (0, express_1.Router)();
const SettingsSchema = zod_1.z.object({
    key: zod_1.z.string(),
    value: zod_1.z.string(),
});
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
router.get('/', (0, index_1.asyncHandler)(async (req, res) => {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId || !UUID_REGEX.test(tenantId)) {
        return res.status(400).json({ error: 'Invalid or missing x-tenant-id header' });
    }
    const rows = await (0, db_1.withTenant)(tenantId, async (client) => {
        const { rows } = await client.query('SELECT key, value FROM settings WHERE tenant_id = $1', [tenantId]);
        return rows;
    });
    const settings = rows.reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
    }, {});
    res.json(settings);
}));
router.post('/', (0, index_1.asyncHandler)(async (req, res) => {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId || !UUID_REGEX.test(tenantId)) {
        return res.status(400).json({ error: 'Invalid or missing x-tenant-id header' });
    }
    const { key, value } = SettingsSchema.parse(req.body);
    // Require admin to change settings
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    await (0, db_1.withTenant)(tenantId, async (client) => {
        await client.query(`INSERT INTO settings (key, value, tenant_id) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`, [key, value, tenantId]);
    });
    res.json({ message: 'Settings saved successfully' });
}));
exports.default = router;
