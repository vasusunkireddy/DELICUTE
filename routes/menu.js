const express = require('express');
const router = express.Router();
const fs = require('fs/promises');

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
  if (!customer || typeof customer !== 'object' || !customer.name || typeof customer.name !== 'string' || customer.name.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Customer object with a non-empty name string is required' });
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
    const itemId = Number(item._id);
    if (!item._id || isNaN(itemId) || !Number.isInteger(itemId) || !Number.isInteger(item.quantity) || item.quantity < 1 || isNaN(Number(item.price)) || Number(item.price) < 0) {
      return res.status(400).json({ success: false, message: 'Invalid item data: _id (integer), quantity (integer >= 1), and price (number >= 0) are required' });
    }
  }

  let connection;
  try {
    // Acquire a connection from the pool
    connection = await req.app.locals.db.getConnection();
    console.log('Connection acquired for order placement');

    // Verify items exist in menu
    const itemIds = items.map(item => Number(item._id));
    const [menuItems] = await connection.query('SELECT id, category FROM menu WHERE id IN (?)', [itemIds]);
    const validItemIds = menuItems.map(item => item.id);
    const invalidItems = itemIds.filter(id => !validItemIds.includes(id));
    if (invalidItems.length > 0) {
      return res.status(400).json({ success: false, message: `Invalid menu item IDs: ${invalidItems.join(', ')}` });
    }

    // Verify coupon
    let couponData = null;
    if (coupon) {
      const [couponRows] = await connection.query(
        'SELECT id, code, category, buy_x, discount FROM coupons WHERE code = ? AND valid_from <= NOW() AND valid_to >= NOW()',
        [coupon.trim()]
      );
      if (couponRows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid or expired coupon code' });
      }
      couponData = couponRows[0];

      // Validate coupon eligibility
      const eligibleItems = items.filter(item => {
        const menuItem = menuItems.find(m => m.id === Number(item._id));
        return menuItem && menuItem.category === couponData.category;
      });
      const eligibleQuantity = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);
      if (eligibleQuantity < couponData.buy_x) {
        return res.status(400).json({ success: false, message: `Coupon requires at least ${couponData.buy_x} items from ${couponData.category}` });
      }
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    let discount = 0;
    if (couponData) {
      const eligibleItems = items.filter(item => {
        const menuItem = menuItems.find(m => m.id === Number(item._id));
        return menuItem && menuItem.category === couponData.category;
      });
      const eligibleQuantity = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);
      const discountItems = Math.floor(eligibleQuantity / couponData.buy_x);
      if (discountItems > 0) {
        const minPrice = eligibleItems.reduce((min, item) => Math.min(min, Number(item.price)), Infinity);
        discount = discountItems * (minPrice * (couponData.discount / 100));
      }
    }
    const total = Math.max(subtotal - discount, 0);

    // Start transaction
    await connection.beginTransaction();
    console.log('Transaction started');

    // Insert into orders
    const [orderResult] = await connection.query(
      'INSERT INTO orders (customer_name, table_number, special_instructions, coupon_code, subtotal, discount, total, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [customer.name.trim(), Number(tableNumber), specialInstructions?.trim() || null, coupon?.trim() || null, subtotal, discount, total]
    );
    const orderId = orderResult.insertId;
    console.log('Order inserted, orderId:', orderId);

    // Insert into order_items
    const orderItems = items.map(item => [
      orderId,
      Number(item._id),
      Number(item.quantity),
      Number(item.price)
    ]);
    console.log('Order items to insert:', orderItems);

    await connection.query(
      'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ?',
      [orderItems]
    );
    console.log('Order items inserted');

    await connection.commit();
    console.log('Transaction committed');

    res.json({ success: true, message: 'Order placed successfully', data: { orderId, subtotal, discount, total } });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      console.log('Transaction rolled back');
    }
    console.error('Error placing order:', error.message, error.sqlMessage, error.sql);
    res.status(500).json({ success: false, message: 'Failed to place order', error: error.message, sqlMessage: error.sqlMessage, sql: error.sql });
  } finally {
    if (connection) {
      connection.release();
      console.log('Connection released');
    }
  }
});

module.exports = router;