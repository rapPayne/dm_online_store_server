const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { requireAuth, requireAdmin, requireOwnership } = require('../middleware/auth');
const { readDatabase, writeDatabase } = require('../utils/database');

const router = express.Router();

// Get all users (admin only)
router.get('/', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = readDatabase();
    const usersWithoutPasswords = db.users.map(({ password, ...user }) => user);
    res.json(usersWithoutPasswords);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:userId', requireAuth, requireOwnership, (req, res) => {
  try {
    const db = readDatabase();
    const user = db.users.find(u => u.id === req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user (users can update their own account)
router.patch('/:userId', [
  requireAuth,
  requireOwnership,
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('fullName').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = readDatabase();
    const userIndex = db.users.findIndex(u => u.id === req.params.userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { email, fullName, password } = req.body;
    const updates = {};

    if (email) {
      // Check if email is already taken by another user
      const emailExists = db.users.find(u => u.email === email && u.id !== req.params.userId);
      if (emailExists) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      updates.email = email;
    }

    if (fullName) {
      updates.fullName = fullName;
    }

    if (password) {
      const saltRounds = 12;
      updates.password = await bcrypt.hash(password, saltRounds);
    }

    // Update user
    db.users[userIndex] = { ...db.users[userIndex], ...updates, updatedAt: new Date().toISOString() };
    writeDatabase(db);

    const { password: _, ...userWithoutPassword } = db.users[userIndex];
    res.json({
      message: 'User updated successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

module.exports = router;