const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Secure DB connection using SSL (Aiven Cloud)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'delicute',
  ssl: {
    ca: fs.readFileSync(path.join(__dirname, 'ca.pem'))
  },
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

// ✅ Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Routes
const adminRoutes = require('./routes/admin');           // Auth: login/signup
const dashboardRoutes = require('./routes/admindashboard'); // Menu + Orders
const menuRoutes = require('./routes/menu');            // Menu and Orders

app.use('/api', adminRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', menuRoutes);

// ✅ Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admindashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admindashboard.html'));
});

// ✅ 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: '❌ Route not found' });
});

// ✅ Global Error handler
app.use((err, req, res, next) => {
  console.error('🔥 Internal Server Error:', err.stack);
  res.status(500).json({ error: '💥 Internal Server Error' });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});