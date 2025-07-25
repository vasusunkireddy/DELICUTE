const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const router = express.Router();
require('dotenv').config();

// MySQL connection pool configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'delicutee123-oakdental.c.aivencloud.com',
  port: process.env.DB_PORT || 22371,
  user: process.env.DB_USER || 'avnadmin',
  password: process.env.DB_PASSWORD || 'AVNS_gvs8yi_wS0I7LdEAcLC',
  database: process.env.DB_NAME || 'delicute',
  connectionLimit: 10,
  connectTimeout: 10000,
  waitForConnections: true,
  queueLimit: 0
});

// Multer configuration for image uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '..', 'Uploads');
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueName = `item_${Date.now()}${ext}`;
      cb(null, uniqueName);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware to authenticate JWT token
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided', error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Authentication error:', { message: err.message, stack: err.stack });
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired', error: 'Unauthorized' });
    }
    return res.status(403).json({ message: 'Invalid token', error: 'Forbidden' });
  }
};

// Middleware to validate menu item input
const validateMenuInput = (req, res, next) => {
  const { name, description, price, category } = req.body;
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ message: 'Name must be at least 2 characters long', error: 'Bad Request' });
  }
  if (!description || description.trim().length < 10) {
    return res.status(400).json({ message: 'Description must be at least 10 characters long', error: 'Bad Request' });
  }
  if (!price || isNaN(price) || Number(price) <= 0) {
    return res.status(400).json({ message: 'Price must be a positive number', error: 'Bad Request' });
  }
  if (!category || category.trim().length < 2) {
    return res.status(400).json({ message: 'Category must be at least 2 characters long', error: 'Bad Request' });
  }
  next();
};

// Middleware to validate order input
const validateOrderInput = (req, res, next) => {
  const { customerName, tableNumber, items, extraToppings, total } = req.body;
  if (!customerName || customerName.trim().length < 2) {
    return res.status(400).json({ message: 'Customer name must be at least 2 characters long', error: 'Bad Request' });
  }
  if (!tableNumber || tableNumber.toString().trim().length === 0) {
    return res.status(400).json({ message: 'Table number is required', error: 'Bad Request' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Items must be a non-empty array', error: 'Bad Request' });
  }
  if (!total || isNaN(total) || Number(total) <= 0) {
    return res.status(400).json({ message: 'Total must be a positive number', error: 'Bad Request' });
  }
  for (const item of items) {
    if (!item.item || !item.price || !item.quantity || isNaN(item.price) || isNaN(item.quantity) || item.quantity < 1) {
      return res.status(400).json({ message: 'Each item must have a valid name, price, and quantity', error: 'Bad Request' });
    }
  }
  next();
};

// Middleware to validate order delivery update
const validateOrderDelivery = (req, res, next) => {
  const { is_delivered } = req.body;
  if (typeof is_delivered !== 'boolean') {
    return res.status(400).json({ message: 'is_delivered must be a boolean', error: 'Bad Request' });
  }
  next();
};

// Admin login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required', error: 'Bad Request' });
  }

  try {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute('SELECT id, email, password FROM admins WHERE email = ?', [email]);
      if (rows.length === 0) {
        return res.status(401).json({ message: 'Invalid email or password', error: 'Unauthorized' });
      }

      const admin = rows[0];
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password', error: 'Unauthorized' });
      }

      const token = jwt.sign(
        { userId: admin.id, email: admin.email },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '1h' }
      );
      res.json({ message: 'Login successful', token });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Error during login:', { message: err.message, stack: err.stack });
    res.status(500).json({ message: 'Failed to login', error: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh-token', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(401).json({ message: 'No token provided', error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', { ignoreExpiration: true });
    const newToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );
    res.json({ message: 'Token refreshed successfully', token: newToken });
  } catch (err) {
    console.error('Error refreshing token:', { message: err.message, stack: err.stack });
    res.status(403).json({ message: 'Invalid token', error: 'Forbidden' });
  }
});

// Add new menu item
router.post('/menu', authenticate, upload.single('image'), validateMenuInput, async (req, res) => {
  const { name, description, price, category } = req.body;
  const image = req.file ? `/Uploads/${req.file.filename}` : null;

  if (!image) {
    return res.status(400).json({ message: 'Image file is required', error: 'Bad Request' });
  }

  try {
    const conn = await pool.getConnection();
    try {
      const [result] = await conn.execute(
        'INSERT INTO menu_items (name, description, image, price, category, is_top, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [name.trim(), description.trim(), image, Number(price), category.trim(), false]
      );
      res.status(201).json({ message: 'Menu item added successfully', id: result.insertId });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Error adding menu item:', { message: err.message, sql: err.sql, stack: err.stack });
    res.status(500).json({ message: 'Failed to add menu item', error: 'Internal server error' });
  }
});

// Get all menu items
router.get('/menu', authenticate, async (req, res) => {
  try {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute(
        'SELECT id, name, description, image, price, category, is_top, created_at, updated_at FROM menu_items ORDER BY id DESC'
      );
      res.json(rows);
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Error fetching menu items:', { message: err.message, sql: err.sql, stack: err.stack });
    res.status(500).json({ message: 'Failed to fetch menu items', error: 'Internal server error' });
  }
});

// Update menu item
router.put('/menu/:id', authenticate, upload.single('image'), validateMenuInput, async (req, res) => {
  const { id } = req.params;
  const { name, description, price, category } = req.body;
  const image = req.file ? `/Uploads/${req.file.filename}` : null;

  try {
    const conn = await pool.getConnection();
    try {
      const [result] = await conn.execute('SELECT id, image FROM menu_items WHERE id = ?', [id]);
      if (result.length === 0) {
        return res.status(404).json({ message: 'Menu item not found', error: 'Not Found' });
      }

      const updates = {
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        category: category.trim()
      };
      let query = 'UPDATE menu_items SET name = ?, description = ?, price = ?, category = ?, updated_at = NOW()';
      const params = [updates.name, updates.description, updates.price, updates.category];

      if (image) {
        const oldImagePath = path.join(__dirname, '..', result[0].image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
        query += ', image = ?';
        params.push(image);
      }

      query += ' WHERE id = ?';
      params.push(id);

      await conn.execute(query, params);
      res.json({ message: 'Menu item updated successfully' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Error updating menu item:', { message: err.message, sql: err.sql, stack: err.stack });
    res.status(500).json({ message: 'Failed to update menu item', error: 'Internal server error' });
  }
});

// Delete menu item
router.delete('/menu/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const conn = await pool.getConnection();
    try {
      const [result] = await conn.execute('SELECT image FROM menu_items WHERE id = ?', [id]);
      if (result.length === 0) {
        return res.status(404).json({ message: 'Menu item not found', error: 'Not Found' });
      }

      const imagePath = path.join(__dirname, '..', result[0].image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      await conn.execute('DELETE FROM menu_items WHERE id = ?', [id]);
      res.json({ message: 'Menu item deleted successfully' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Error deleting menu item:', { message: err.message, sql: err.sql, stack: err.stack });
    res.status(500).json({ message: 'Failed to delete menu item', error: 'Internal server error' });
  }
});

// Toggle top item status
router.post('/menu/top/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const conn = await pool.getConnection();
    try {
      const [result] = await conn.execute('SELECT id, is_top FROM menu_items WHERE id = ?', [id]);
      if (result.length === 0) {
        return res.status(404).json({ message: 'Menu item not found', error: 'Not Found' });
      }

      await conn.execute('UPDATE menu_items SET is_top = ?, updated_at = NOW() WHERE id = ?', [!result[0].is_top, id]);
      res.json({ message: 'Top item status toggled successfully', is_top: !result[0].is_top });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Error toggling top item:', { message: err.message, sql: err.sql, stack: err.stack });
    res.status(500).json({ message: 'Failed to toggle top item', error: 'Internal server error' });
  }
});

// Add new order
router.post('/orders', validateOrderInput, async (req, res) => {
  const { customerName, tableNumber, items, extraToppings, total } = req.body;

  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Insert into orders table, including items as JSON for backward compatibility
      const [orderResult] = await conn.execute(
        'INSERT INTO orders (customer_name, table_number, extra_toppings, total, items, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [customerName.trim(), tableNumber.toString().trim(), extraToppings ? extraToppings.trim() : '', Number(total), JSON.stringify(items)]
      );
      const orderId = orderResult.insertId;

      // Insert items into order_items table
      for (const item of items) {
        await conn.execute(
          'INSERT INTO order_items (order_id, item_name, price, quantity) VALUES (?, ?, ?, ?)',
          [orderId, item.item.trim(), Number(item.price), Number(item.quantity)]
        );
      }

      await conn.commit();
      res.status(201).json({ message: 'Order placed successfully', orderId });
    } catch (err) {
      await conn.rollback();
      console.error('Error placing order:', { message: err.message, sql: err.sql, stack: err.stack });
      res.status(500).json({ message: 'Failed to place order', error: 'Internal server error' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Error getting database connection:', { message: err.message, stack: err.stack });
    res.status(500).json({ message: 'Failed to place order', error: 'Internal server error' });
  }
});

// Get all orders
router.get('/orders', authenticate, async (req, res) => {
  try {
    const conn = await pool.getConnection();
    try {
      const [orders] = await conn.execute(
        'SELECT id, customer_name, table_number, extra_toppings, total, is_delivered, created_at, updated_at, items FROM orders ORDER BY created_at DESC'
      );
      const [orderItems] = await conn.execute(
        'SELECT order_id, item_name AS item, price, quantity FROM order_items'
      );

      // Combine orders with items from order_items or parse items JSON as fallback
      const ordersWithItems = orders.map(order => {
        let items = orderItems
          .filter(item => item.order_id === order.id)
          .map(item => ({ item: item.item, price: item.price, quantity: item.quantity }));
        
        // Fallback to parsing items JSON if order_items is empty for this order
        if (items.length === 0 && order.items) {
          try {
            items = JSON.parse(order.items);
          } catch (e) {
            console.warn(`Failed to parse items JSON for order ${order.id}:`, e.message);
            items = [];
          }
        }

        return {
          ...order,
          items
        };
      });

      res.json(ordersWithItems);
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Error fetching orders:', { message: err.message, sql: err.sql, stack: err.stack });
    res.status(500).json({ message: 'Failed to fetch orders', error: 'Internal server error' });
  }
});

// Mark order as delivered
router.put('/orders/:id/deliver', authenticate, validateOrderDelivery, async (req, res) => {
  const { id } = req.params;
  const { is_delivered } = req.body;

  try {
    const conn = await pool.getConnection();
    try {
      const [result] = await conn.execute('SELECT id, is_delivered FROM orders WHERE id = ?', [id]);
      if (result.length === 0) {
        return res.status(404).json({ message: 'Order not found', error: 'Not Found' });
      }

      if (result[0].is_delivered) {
        return res.status(400).json({ message: 'Order is already marked as delivered', error: 'Bad Request' });
      }

      await conn.execute('UPDATE orders SET is_delivered = ?, updated_at = NOW() WHERE id = ?', [is_delivered, id]);
      res.json({ message: 'Order marked as delivered successfully' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Error marking order as delivered:', { message: err.message, sql: err.sql, stack: err.stack });
    res.status(500).json({ message: 'Failed to mark order as delivered', error: 'Internal server error' });
  }
});

module.exports = router;