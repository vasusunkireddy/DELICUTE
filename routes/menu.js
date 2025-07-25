// routes/api.js
const express = require('express');
const router = express.Router();

// Get menu items
router.get('/menu', async (req, res) => {
  try {
    const [rows] = await req.app.locals.db.query('SELECT id, name, description, price, category, image, saved_amount AS savedAmount FROM menu');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching menu:', error.message, error.sqlMessage);
    res.status(500).json({ success: false, message: 'Failed to fetch menu items', error: error.message });
  }
});

// Get top picks
router.get('/top-picks', async (req, res) => {
  try {
    const [rows] = await req.app.locals.db.query(`
      SELECT m.id, m.name, m.description, m.price, m.category, m.image, m.saved_amount AS savedAmount
      FROM menu m
      INNER JOIN top_picks tp ON m.id = tp.item_id
    `);
    res.json({ success: true, data: rows.length ? rows : [], message: rows.length ? undefined : 'No top picks available' });
  } catch (error) {
    console.error('Error fetching top picks:', error.message, error.sqlMessage);
    res.status(500).json({ success: false, message: 'Failed to fetch top picks', error: error.message });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const query = 'SELECT id, name FROM categories ORDER BY name';
    console.log('Executing query:', query);
    const [rows] = await req.app.locals.db.query(query);
    res.json({ success: true, data: rows.length ? rows : [], message: rows.length ? undefined : 'No categories available' });
  } catch (error) {
    console.error('Error fetching categories:', error.message, error.sqlMessage, error.sql);
    res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message, sqlMessage: error.sqlMessage });
  }
});

// Get coupons
router.get('/coupons', async (req, res) => {
  try {
    const now = new Date().toISOString().split('T')[0];
    const [rows] = await req.app.locals.db.query(
      'SELECT id, code, description, category, buy_x, discount, valid_from AS validFrom, valid_to AS validTo, image FROM coupons WHERE valid_from <= ? AND valid_to >= ?',
      [now, now]
    );
    res.json({ success: true, data: rows.length ? rows : [], message: rows.length ? undefined : 'No valid coupons available' });
  } catch (error) {
    console.error('Error fetching coupons:', error.message, error.sqlMessage);
    res.status(500).json({ success: false, message: 'Failed to fetch coupons', error: error.message });
  }
});

// Place an order
router.post('/orders', async (req, res) => {
  const { customer, tableNumber, specialInstructions, items, coupon } = req.body;

  // Input validation
  if (!customer?.name || typeof customer.name !== 'string' || customer.name.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Customer name is required and must be a non-empty string' });
  }
  if (!Number.isInteger(Number(tableNumber)) || tableNumber < 1 || tableNumber > 100) {
    return res.status(400).json({ success: false, message: 'Table number must be an integer between 1 and 100' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Items array is required and must not be empty' });
  }
  if (coupon && typeof coupon !== 'string') {
    return res.status(400).json({ success: false, message: 'Coupon code must be a string' });
  }

  // Validate items
  for (const item of items) {
    if (!item._id || !Number.isInteger(Number(item._id)) || !Number.isInteger(item.quantity) || item.quantity < 1 || isNaN(Number(item.price))) {
      return res.status(400).json({ success: false, message: 'Invalid item data: id, quantity, and price are required' });
    }
  }

  try {
    // Verify coupon
    if (coupon) {
      const [couponRows] = await req.app.locals.db.query('SELECT * FROM coupons WHERE code = ? AND valid_from <= NOW() AND valid_to >= NOW()', [coupon]);
      if (couponRows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid or expired coupon code' });
      }
    }

    // Transaction
    const connection = await req.app.locals.db;
    try {
      await connection.beginTransaction();

      const [orderResult] = await connection.query(
        'INSERT INTO orders (customer_name, table_number, special_instructions, coupon_code, created_at) VALUES (?, ?, ?, ?, NOW())',
        [customer.name.trim(), Number(tableNumber), specialInstructions?.trim() || null, coupon || null]
      );

      const orderId = orderResult.insertId;
      const orderItems = items.map(item => [
        orderId,
        Number(item._id),
        Number(item.quantity),
        Number(item.price)
      ]);

      await connection.query(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ?',
        [orderItems]
      );

      await connection.commit();
      res.json({ success: true, message: 'Order placed successfully', data: { orderId } });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error placing order:', error.message, error.sqlMessage);
    res.status(500).json({ success: false, message: 'Failed to place order', error: error.message });
  }
});

module.exports = router;