const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs/promises');

dotenv.config();

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://delicute-3bf1.onrender.com',
  process.env.FRONTEND_URL || 'https://your-frontend-url.com'
].filter(origin => origin); // Remove undefined origins

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Serve static files for the 'public' folder (e.g., frontend assets)
app.use(express.static(path.join(__dirname, 'public')));

// Note: Removed /Uploads static middleware since coupon images are on Cloudinary
// If you need /Uploads for other local files, add conditional logic to skip Cloudinary URLs
// app.use('/Uploads', express.static(path.join(__dirname, 'Uploads'), {
//   fallthrough: false,
//   setHeaders: (res) => {
//     res.set('Cache-Control', 'public, max-age=31536000');
//   }
// }));

// Ensure 'Uploads' folder exists (only if needed for other local files)
const initializeUploadsFolder = async () => {
  const uploadPath = path.join(__dirname, 'Uploads');
  try {
    await fs.mkdir(uploadPath, { recursive: true });
    console.log('✅ Created Uploads folder:', uploadPath);
  } catch (err) {
    console.error('❌ Failed to create Uploads folder:', { message: err.message });
    process.exit(1);
  }
};

// MySQL connection pool
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
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,
      connectTimeout: 30000
    };

    if (isProduction) {
      try {
        const caCert = await fs.readFile(path.join(__dirname, 'ca.pem'), 'utf8');
        config.ssl = { ca: caCert };
      } catch (err) {
        console.error('❌ Failed to read ca.pem for SSL:', { message: err.message });
        throw new Error('Unable to load SSL certificate');
      }
    }

    return mysql.createPool(config);
  } catch (err) {
    console.error('❌ Failed to initialize MySQL pool:', { message: err.message });
    throw err;
  }
};

// Initialize pool and store it globally
let pool;
const initializeServer = async () => {
  try {
    // Only initialize Uploads folder if needed for other local files
    // await initializeUploadsFolder();
    pool = await initializePool();
    app.locals.db = pool;

    // Verify MySQL connection
    const conn = await pool.getConnection();
    console.log('✅ Connected to MySQL');
    conn.release();

    // Load routes
    try {
      const adminRoutes = require('./routes/admin');
      const dashboardRoutes = require('./routes/admindashboard');
      const apiRoutes = require('./routes/menu');
      const couponRoutes = require('./routes/coupon');

      // Public routes (no authentication)
      app.use('/api', apiRoutes);
      app.use('/api', couponRoutes);

      // Authenticated routes
      app.use('/api/auth', adminRoutes);
      app.use('/api', dashboardRoutes);

      console.log('🚀 Routes loaded successfully');
    } catch (err) {
      console.error('❌ Failed to load routes:', { message: err.message, stack: err.stack });
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Server initialization failed:', { message: err.message, stack: err.stack });
    process.exit(1);
  }
};

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    if (!pool) throw new Error('Database pool not initialized');
    await pool.query('SELECT 1');
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Health check failed:', { message: error.message, stack: error.stack });
    res.status(500).json({ status: 'ERROR', message: 'Database unavailable', error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', { message: err.message, stack: err.stack, path: req.path });
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

// Start server
const PORT = process.env.PORT || 3000;
initializeServer().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http${isProduction ? 's' : ''}://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('❌ Failed to start server:', { message: err.message, stack: err.stack });
  process.exit(1);
});