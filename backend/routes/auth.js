/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { DEV_ALLOWED_EMAILS, DEV_PASSWORD, ensureDevFacultySeed } = require('../utils/devSeed');
const { logActivity } = require('../utils/activityLogger');
const { authMiddleware } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, full_name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if user exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      password_hash,
      full_name: full_name || email.split('@')[0]
    });

    res.status(201).json({
      status: 'success',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login and get JWT token
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );

    await logActivity(user.id, 'Login');

    res.json({
      status: 'success',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/dev-login
 * Development-only login for seeded faculty users
 */
router.post('/dev-login', async (req, res, next) => {
  try {
    if ((process.env.NODE_ENV || 'development') === 'production') {
      return res.status(403).json({ error: 'Dev login is disabled in production' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (!DEV_ALLOWED_EMAILS.has(email) || password !== DEV_PASSWORD) {
      return res.status(401).json({ error: 'Invalid development credentials' });
    }

    await ensureDevFacultySeed();

    const user = await User.findOne({ where: { email } });

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    await logActivity(user.id, 'Login (Dev)');

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );

    res.json({
      status: 'success',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side only in JWT)
 */
router.post('/logout', authMiddleware, async (req, res) => {
  await logActivity(req.user.id, 'Logout');
  res.json({ status: 'success', message: 'Logged out' });
});

/**
 * GET /api/auth/me
 * Validate token and get current logged-in user info
 */
router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    status: 'success',
    user: req.user
  });
});

/**
 * POST /api/auth/change-password
 * Change account password
 */
router.post('/change-password', authMiddleware, async (req, res, next) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Email, current password and new password are required' });
    }

    if (req.user.email !== email) {
      return res.status(403).json({ error: 'You can only change your own password' });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.password_hash = await bcrypt.hash(newPassword, 10);
    await user.save();

    await logActivity(req.user.id, 'Password Change');

    res.json({ status: 'success', message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/update-profile
 * Update profile name
 */
router.post('/update-profile', authMiddleware, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.full_name = name;
    await user.save();
    await logActivity(req.user.id, 'Profile Update', { name });
    res.json({
      status: 'success',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
