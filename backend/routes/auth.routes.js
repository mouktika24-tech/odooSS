const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { pool } = require('../config/db');
const {
  emailRules,
  passwordRules,
  validateRequest,
} = require('../middleware/validator');

const router = express.Router();

const generateToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || 'stocksense-dev-secret',
    { expiresIn: '1d' }
  );

// Register
router.post(
  '/register',
  [
    body('name')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Name must be at least 2 characters long'),
    ...emailRules('email'),
    ...passwordRules('password', 8),
    validateRequest,
  ],
  async (req, res) => {
    try {
      const { name, email, password } = req.body;

      const existingUser = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message:
            'This email is already registered. Please log in or use a different email address.',
          errors: [],
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, role, created_at`,
        [name, email, passwordHash, 'WAREHOUSE_STAFF']
      );

      const user = result.rows[0];

      return res.status(201).json({
        success: true,
        message: 'User registered successfully.',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Register error:', error);

      return res.status(500).json({
        success: false,
        message:
          'Something went wrong while creating your account. Please try again.',
        errors: [],
      });
    }
  }
);

// Login
router.post(
  '/login',
  [
    ...emailRules('email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required.'),
    validateRequest,
  ],
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const result = await pool.query(
        `SELECT id, name, email, password_hash, role
         FROM users
         WHERE LOWER(email) = LOWER($1)`,
        [email]
      );

      const user = result.rows[0];

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            'We could not find an account with that email address. Please register first.',
          errors: [],
        });
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash
      );

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect password. Please try again.',
          errors: [],
        });
      }

      const token = generateToken(user);

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Login error:', error);

      return res.status(500).json({
        success: false,
        message: 'Unable to log you in right now. Please try again later.',
        errors: [],
      });
    }
  }
);

// Forgot Password OTP Mock
router.post(
  '/forgot-password-otp',
  [...emailRules('email'), validateRequest],
  async (req, res) => {
    try {
      const { email } = req.body;

      const result = await pool.query(
        'SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No account was found for that email address.',
          errors: [],
        });
      }

      const otp = String(
        Math.floor(100000 + Math.random() * 900000)
      );

      return res.status(200).json({
        success: true,
        message: 'A one-time password has been generated.',
        otp,
        expiresInMinutes: 10,
      });
    } catch (error) {
      console.error('Forgot password OTP error:', error);

      return res.status(500).json({
        success: false,
        message:
          'We could not generate a password reset code right now. Please try again.',
        errors: [],
      });
    }
  }
);

module.exports = router;