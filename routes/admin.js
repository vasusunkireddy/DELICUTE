const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const router = express.Router();
require('dotenv').config();

// ✅ Create MySQL connection pool with SSL
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: fs.readFileSync(path.join(__dirname, '..', 'ca.pem'))
  },
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 10000
});

// ✅ Middleware: validate inputs
const validateInput = (req, res, next) => {
  const { name, email, password } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (req.path === '/signup') {
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }
  }

  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  next();
};

// ✅ Admin Signup Route
router.post('/signup', validateInput, async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const conn = await pool.getConnection();
    try {
      const [exists] = await conn.execute('SELECT email FROM admins WHERE email = ?', [email]);
      if (exists.length > 0) {
        return res.status(409).json({ message: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await conn.execute(
        'INSERT INTO admins (name, email, password, created_at) VALUES (?, ?, ?, NOW())',
        [name.trim(), email.toLowerCase(), hashedPassword]
      );

      const token = jwt.sign(
        { email, name },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '2d' }
      );

      res.status(201).json({ token, message: 'Signup successful' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('🔥 Signup error:', err.message);
    res.status(500).json({ message: 'Signup failed', error: 'Internal server error' });
  }
});

// ✅ Admin Login Route
router.post('/login', validateInput, async (req, res) => {
  const { email, password } = req.body;

  try {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute('SELECT * FROM admins WHERE email = ?', [email.toLowerCase()]);
      if (rows.length === 0) {
        return res.status(401).json({ message: 'Email not found' });
      }

      const user = rows[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Incorrect password' });
      }

      const token = jwt.sign(
        { email: user.email, name: user.name },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '2d' }
      );

      res.json({ token, message: 'Login successful' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('🔥 Login error:', err.message);
    res.status(500).json({ message: 'Login failed', error: 'Internal server error' });
  }
});

// Optional: Export authentication middleware if needed later
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

module.exports = router;
