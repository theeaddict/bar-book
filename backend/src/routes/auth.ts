import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { pool } from '../db';
import { asyncHandler, JWT_SECRET } from '../index';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in a minute.' },
});

const AuthSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
});

const CreateUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
  role: z.enum(['admin', 'staff']).optional().default('staff'),
});

const UpdateUserSchema = z.object({
  password: z.string().min(8).optional(),
  role: z.enum(['admin', 'staff']).optional(),
});

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
}

// Create User (Admin only)
router.post('/users', requireAdmin, asyncHandler(async (req, res) => {
  const { username, password, role } = CreateUserSchema.parse(req.body);
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant context missing' });
  }

  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT id FROM public.users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await client.query(
      'INSERT INTO public.users (tenant_id, username, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, role',
      [tenantId, username, password_hash, role]
    );

    res.json({ message: 'User created successfully', user: result.rows[0] });
  } finally {
    client.release();
  }
}));

// Get Users (Admin only)
router.get('/users', requireAdmin, asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenantId;
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      'SELECT id, username, role, created_at FROM public.users WHERE tenant_id = $1 ORDER BY created_at ASC',
      [tenantId]
    );
    res.json(rows);
  } finally {
    client.release();
  }
}));

// Update User (Admin only)
router.put('/users/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = UpdateUserSchema.parse(req.body);
  const tenantId = req.user?.tenantId;

  // Self-modification guard: admin cannot change their own role
  if (id === req.user?.id && data.role) {
    return res.status(403).json({ error: 'Cannot change your own role' });
  }

  const client = await pool.connect();
  try {
    if (data.password) {
      const password_hash = await bcrypt.hash(data.password, 10);
      await client.query(
        'UPDATE public.users SET password_hash = $1, role = COALESCE($2, role) WHERE id = $3 AND tenant_id = $4',
        [password_hash, data.role, id, tenantId]
      );
    } else if (data.role) {
      await client.query(
        'UPDATE public.users SET role = $1 WHERE id = $2 AND tenant_id = $3',
        [data.role, id, tenantId]
      );
    }
    res.json({ message: 'User updated successfully' });
  } finally {
    client.release();
  }
}));

// Login
router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { username, password } = AuthSchema.parse(req.body);

  const client = await pool.connect();
  try {
    const result = await client.query('SELECT id, tenant_id, password_hash, role FROM public.users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Default tenantId to user.id if it's null (for backwards compatibility)
    const effectiveTenantId = user.tenant_id || user.id;

    const token = jwt.sign(
      { tenantId: effectiveTenantId, userId: user.id, username, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({ token, tenantId: effectiveTenantId, username, role: user.role });
  } finally {
    client.release();
  }
}));

// GET public bar name for login page
router.get('/bar-name', asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT value FROM settings WHERE key = 'bar_name' LIMIT 1");
    if (rows.length > 0) {
      res.json({ barName: rows[0].value });
    } else {
      res.json({ barName: null });
    }
  } finally {
    client.release();
  }
}));

export default router;
