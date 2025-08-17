/**
 * Authentication API routes
 * Handle user registration, login, token management, etc.
 */
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * Admin Registration
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      res.status(400).json({
        success: false,
        error: 'Email, password, and name are required'
      });
      return;
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM admins WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
      return;
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new admin
    const result = await pool.query(
      'INSERT INTO admins (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, passwordHash, name]
    );

    const newUser = result.rows[0];

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({
        success: false,
        error: 'JWT secret not configured'
      });
      return;
    }

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: 'admin' // Default role for admins table
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Admin Login
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
      return;
    }

    // Get user from database
    const result = await pool.query(
      'SELECT id, email, password_hash, name FROM admins WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
      return;
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
      return;
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({
        success: false,
        error: 'JWT secret not configured'
      });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'admin' // Default role for admins table
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Verify Token
 * POST /api/auth/verify
 */
router.post('/verify', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      valid: true,
      user: req.user
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * User Logout (client-side token removal)
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  // Since we're using stateless JWT, logout is handled client-side
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * Get All Users (Admin only)
 * GET /api/auth/users
 */
router.get('/users', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Create New User (Admin only)
 * POST /api/auth/users
 */
router.post('/users', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, email, password, role } = req.body;

    // Validate input
    if (!username || !email || !password || !role) {
      res.status(400).json({
        success: false,
        error: 'Username, email, password, and role are required'
      });
      return;
    }

    // Validate role
    const validRoles = ['admin', 'operator', 'security'];
    if (!validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        error: 'Invalid role. Must be admin, operator, or security'
      });
      return;
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'User with this email or username already exists'
      });
      return;
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, is_active, created_at',
      [username, email, passwordHash, role]
    );

    const newUser = result.rows[0];

    res.status(201).json({
      success: true,
      user: newUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Update User (Admin only)
 * PUT /api/auth/users/:id
 */
router.put('/users/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { username, email, password, role } = req.body;

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (username) {
      updates.push(`username = $${params.length + 1}`);
      params.push(username);
    }

    if (email) {
      updates.push(`email = $${params.length + 1}`);
      params.push(email);
    }

    if (password) {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      updates.push(`password_hash = $${params.length + 1}`);
      params.push(passwordHash);
    }

    if (role) {
      const validRoles = ['admin', 'operator', 'security'];
      if (!validRoles.includes(role)) {
        res.status(400).json({
          success: false,
          error: 'Invalid role. Must be admin, operator, or security'
        });
        return;
      }
      updates.push(`role = $${params.length + 1}`);
      params.push(role);
    }

    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
      return;
    }

    // Update user
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length + 1} RETURNING id, username, email, role, is_active, created_at`;
    params.push(id);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Delete User (Admin only)
 * DELETE /api/auth/users/:id
 */
router.delete('/users/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Toggle User Status (Admin only)
 * PATCH /api/auth/users/:id/toggle
 */
router.patch('/users/:id/toggle', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id, is_active FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    const currentStatus = existingUser.rows[0].is_active;
    const newStatus = !currentStatus;

    // Update user status
    const result = await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, username, email, role, is_active, created_at',
      [newStatus, id]
    );

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;