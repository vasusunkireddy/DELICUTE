const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'https://delicute-3bf1.onrender.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const isProduction = process.env.NODE_ENV === 'production';
let sslOptions;

if (isProduction) {
  try {
    sslOptions = {
      ca: fs.readFileSync(path.join(__dirname, 'ca.pem')),
    };
  } catch (err) {
    console.error('SSL Error:', err.message);
    process.exit(1);
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: sslOptions,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
});

app.locals.db = pool;

pool.getConnection()
  .then(conn => {
    console.log('✅ Connected to MySQL');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL Connection Error:', err.message);
    process.exit(1);
  });

try {
  const adminRoutes = require('./routes/admin');
  const dashboardRoutes = require('./routes/admindashboard');

  app.use('/api/auth', adminRoutes);
  app.use('/api', dashboardRoutes);

  console.log('🚀 Routes loaded successfully');
} catch (err) {
  console.error('❌ Failed to load routes:', err.message);
  process.exit(1);
}

app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
