const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Secure DB connection using SSL (only on Render)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'delicute',
  ssl: process.env.DB_SSL === 'true' ? {
    ca: fs.readFileSync(path.join(__dirname, 'ca.pem'))
  } : undefined,
  connectTimeout: 10000
};

// ✅ MySQL connection
const db = mysql.createConnection(dbConfig);
db.connect((err) => {
  if (err) {
    console.error('❌ DB connection failed:', err.message);
  } else {
    console.log('✅ Connected to MySQL database');
  }
});
app.locals.db = db;

// ✅ CORS Setup – allow both localhost and Render frontend
app.use(cors({
  origin: ['http://localhost:3000', 'https://delicute-3bf1.onrender.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ API Routes
const adminRoutes = require('./routes/admin');
const dashboardRoutes = require('./routes/admindashboard');
const menuRoutes = require('./routes/menu');

app.use('/api', adminRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', menuRoutes);

// ✅ Serve frontend pages directly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/admindashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admindashboard.html'));
});

// ✅ 404 fallback for unknown routes
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ error: '❌ API route not found' });
  }
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html')); // optional
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Internal Server Error:', err.stack);
  res.status(500).json({ error: '💥 Internal Server Error' });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
