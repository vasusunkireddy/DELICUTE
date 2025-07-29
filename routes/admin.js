const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const fs = require('fs/promises');

const router = express.Router();

// === MySQL Connection Pool ===
const initializePool = async () => {
  try {
    const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Environment variable ${envVar} is not set`);
      }
    }

    const config = {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };

    if (process.env.NODE_ENV === 'production') {
      try {
        const caCert = await fs.readFile(`${__dirname}/../ca.pem`, 'utf8');
        config.ssl = { ca: caCert };
      } catch (err) {
        console.error('Failed to read ca.pem for SSL:', { message: err.message });
        throw new Error('Unable to load SSL certificate');
      }
    }

    return mysql.createPool(config);
  } catch (err) {
    console.error('Failed to initialize MySQL pool:', { message: err.message });
    throw err;
  }
};

// Initialize pool and store it globally
let pool;
initializePool()
  .then(createdPool => {
    pool = createdPool;
    console.log('MySQL connection pool initialized successfully');
  })
  .catch(err => {
    console.error('Error initializing MySQL pool:', { message: err.message });
    process.exit(1); // Exit process if pool initialization fails
  });

// === Signup ===
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0 ||
        !email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Valid name, email, and password (min 8 characters) are required' });
    }

    if (!pool) throw new Error('Database pool not initialized');

    const [existing] = await pool.query('SELECT id FROM admins WHERE email = ?', [email.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO admins (name, email, password) VALUES (?, ?, ?)',
      [name.trim(), email.trim(), hashedPassword]
    );

    res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    console.error('Signup Error:', { message: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: 'Server error during signup', error: err.message });
  }
});

// === Login ===
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !password || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Valid email and password are required' });
    }

    if (!pool) throw new Error('Database pool not initialized');

    const [users] = await pool.query('SELECT * FROM admins WHERE email = ?', [email.trim()]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not set in environment');
    }

    const token = jwt.sign({ id: user.id, role: 'admin' }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour in milliseconds
    });

    res.status(200).json({ success: true, message: 'Login successful' });
  } catch (err) {
    console.error('Login Error:', { message: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: 'Server error during login', error: err.message });
  }
});

// === Logout ===
router.post('/logout', (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (err) {
    console.error('Logout Error:', { message: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: 'Server error during logout', error: err.message });
  }
});

module.exports = router;