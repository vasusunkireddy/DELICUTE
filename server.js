const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'https://delicute-3bf1.onrender.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware
app.use(express.json());
app.use(cookieParser());

// Serve static files from 'public' and 'Uploads' folders
app.use(express.static(path.join(__dirname, 'public')));
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads'), {
  // Fallback for non-existent files
  fallthrough: false,
  // Set headers for cache control
  setHeaders: (res) => {
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
  }
}));

// Ensure 'Uploads' folder exists
const uploadPath = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadPath)) {
  try {
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log('✅ Created Uploads folder');
  } catch (err) {
    console.error('❌ Failed to create Uploads folder:', err.message);
    process.exit(1);
  }
}

const isProduction = process.env.NODE_ENV === 'production';
let sslOptions;

if (isProduction) {
  try {
    sslOptions = {
      ca: fs.readFileSync(path.join(__dirname, 'ca.pem')),
    };
  } catch (err) {
    console.error('❌ SSL Error:', err.message);
    process.exit(1);
  }
}

// MySQL connection pool
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

// Verify MySQL connection
pool.getConnection()
  .then(conn => {
    console.log('✅ Connected to MySQL');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL Connection Error:', err.message);
    process.exit(1);
  });

// Load routes
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});