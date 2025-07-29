const express = require('express');
const router = express.Router();

// Get menu items
router.get('/menu', async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) throw new Error('Database connection not found');

    const [rows] = await db.query(`
      SELECT id, name, description, price, category, image, saved_amount AS savedAmount
      FROM menu
      WHERE is_active = true
      ORDER BY category, name
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching menu:', {
      message: error.message,
      sqlMessage: error.sqlMessage,
      sql: error.sql,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: 'Failed to fetch menu items', error: error.message });
  }
});

// Get top picks
router.get('/top-picks', async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) throw new Error('Database connection not found');

    const [rows] = await db.query(`
      SELECT m.id, m.name, m.description, m.price, m.category, m.image, m.saved_amount AS savedAmount
      FROM menu m
      INNER JOIN top_picks tp ON m.id = tp.item_id
      WHERE m.is_active = true
      ORDER BY m.name
    `);
    res.json({
      success: true,
      data: rows,
      message: rows.length ? undefined : 'No top picks available'
    });
  } catch (error) {
    console.error('Error fetching top picks:', {
      message: error.message,
      sqlMessage: error.sqlMessage,
      sql: error.sql,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: 'Failed to fetch top picks', error: error.message });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) throw new Error('Database connection not found');

    const [rows] = await db.query(`
      SELECT id, name
      FROM categories
      WHERE is_active = true
      ORDER BY name
    `);
    res.json({
      success: true,
      data: rows,
      message: rows.length ? undefined : 'No categories available'
    });
  } catch (error) {
    console.error('Error fetching categories:', {
      message: error.message,
      sqlMessage: error.sqlMessage,
      sql: error.sql,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message });
  }
});

// Get coupons
router.get('/coupons', async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) throw new Error('Database connection not found');

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [rows] = await db.query(`
      SELECT id, code, description, category, buy_x, discount, valid_from AS validFrom, valid_to AS validTo, image
      FROM coupons
      WHERE valid_from <= ? AND valid_to >= ? AND isActive = true
    `, [now, now]);
    res.json({
      success: true,
      data: rows.map(coupon => ({
        ...coupon,
        image: coupon.image ? `${req.protocol}://${req.get('host')}/Uploads/${coupon.image}` : null
      })),
      message: rows.length ? undefined : 'No valid coupons available'
    });
  } catch (error) {
    console.error('Error fetching coupons:', {
      message: error.message,
      sqlMessage: error.sqlMessage,
      sql: error.sql,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: 'Failed to fetch coupons', error: error.message });
  }
});

// Validate coupon
router.post('/validate-coupon', async (req, res) => {
  const { couponCode, items } = req.body;

  if (!couponCode || typeof couponCode !== 'string' || couponCode.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Coupon code must be a non-empty string' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Items array is required and must not be empty' });
  }

  for (const item of items) {
    if (!item._id || isNaN(Number(item._id)) || !Number.isInteger(Number(item._id)) ||
        !Number.isInteger(item.quantity) || item.quantity < 1 ||
        isNaN(Number(item.price)) || Number(item.price) < 0) {
      return res.status(400).json({ success: false, message: 'Invalid item data: _id (integer), quantity (integer >= 1), and price (number >= 0) are required' });
    }
  }

  try {
    const db = req.app.locals.db;
    if (!db) throw new Error('Database connection not found');

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [couponRows] = await db.query(`
      SELECT id, code, category, buy_x, discount
      FROM coupons
      WHERE code = ? AND valid_from <= ? AND valid_to >= ? AND isActive = true
    `, [couponCode.trim(), now, now]);

    if (couponRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired coupon code' });
    }

    const couponData = couponRows[0];
    const itemIds = items.map(item => Number(item._id));
    const [menuItems] = await db.query('SELECT id, category, price FROM menu WHERE id IN (?) AND is_active = true', [itemIds]);
    const validItemIds = menuItems.map(item => item.id);
    const invalidItems = itemIds.filter(id => !validItemIds.includes(id));
    if (invalidItems.length > 0) {
      return res.status(400).json({ success: false, message: `Invalid menu item IDs: ${invalidItems.join(', ')}` });
    }

    const eligibleItems = items.filter(item => {
      const menuItem = menuItems.find(m => m.id === Number(item._id));
      return menuItem && menuItem.category === couponData.category;
    });
    const eligibleQuantity = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);

    if (eligibleQuantity < couponData.buy_x) {
      return res.status(400).json({ success: false, message: `Coupon requires at least ${couponData.buy_x} items from ${couponData.category}` });
    }

    res.json({ success: true, data: couponData });
  } catch (error) {
    console.error('Error validating coupon:', {
      message: error.message,
      sqlMessage: error.sqlMessage,
      sql: error.sql,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: 'Failed to validate coupon', error: error.message });
  }
});

// Place an order
router.post('/orders', async (req, res) => {
  const { customer, tableNumber, specialInstructions, items, coupon } = req.body;

  // Input validation
  if (!customer || typeof customer !== 'object' || !customer.name || typeof customer.name !== 'string' || customer.name.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Customer object with a valid name (min 2 characters) is required' });
  }
  if (!Number.isInteger(Number(tableNumber)) || tableNumber < 1 || tableNumber > 100) {
    return res.status(400).json({ success: false, message: 'Table number must be an integer between 1 and 100' });
  }
  if (specialInstructions && typeof specialInstructions !== 'string') {
    return res.status(400).json({ success: false, message: 'Special instructions must be a string' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Items array is required and must not be empty' });
  }
  if (coupon && (typeof coupon !== 'string' || coupon.trim().length === 0)) {
    return res.status(400).json({ success: false, message: 'Coupon code must be a non-empty string' });
  }

  // Validate items
  for (const item of items) {
    const itemId = Number(item._id);
    if (!item._id || isNaN(itemId) || !Number.isInteger(itemId) || 
        !Number.isInteger(item.quantity) || item.quantity < 1 || 
        isNaN(Number(item.price)) || Number(item.price) < 0) {
      return res.status(400).json({ success: false, message: 'Invalid item data: _id (integer), quantity (integer >= 1), and price (number >= 0) are required' });
    }
  }

  let connection;
  try {
    const db = req.app.locals.db;
    if (!db) throw new Error('Database connection not found');

    connection = await db.getConnection();
    console.log('Connection acquired for order placement');

    // Verify items exist in menu
    const itemIds = items.map(item => Number(item._id));
    const [menuItems] = await connection.query(`
      SELECT id, category, price
      FROM menu
      WHERE id IN (?) AND is_active = true
    `, [itemIds]);
    const validItemIds = menuItems.map(item => item.id);
    const invalidItems = itemIds.filter(id => !validItemIds.includes(id));
    if (invalidItems.length > 0) {
      return res.status(400).json({ success: false, message: `Invalid menu item IDs: ${invalidItems.join(', ')}` });
    }

    // Verify coupon
    let couponData = null;
    if (coupon) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const [couponRows] = await connection.query(`
        SELECT id, code, category, buy_x, discount
        FROM coupons
        WHERE code = ? AND valid_from <= ? AND valid_to >= ? AND isActive = true
      `, [coupon.trim(), now, now]);
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

    // Calculate totals with server-side price validation
    const subtotal = items.reduce((sum, item) => {
      const menuItem = menuItems.find(m => m.id === Number(item._id));
      return sum + (menuItem.price * item.quantity);
    }, 0);
    let discount = 0;
    if (couponData) {
      const eligibleItems = items.filter(item => {
        const menuItem = menuItems.find(m => m.id === Number(item._id));
        return menuItem && menuItem.category === couponData.category;
      });
      const eligibleQuantity = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);
      const discountItems = Math.floor(eligibleQuantity / couponData.buy_x);
      if (discountItems > 0) {
        const minPrice = eligibleItems.reduce((min, item) => {
          const menuItem = menuItems.find(m => m.id === Number(item._id));
          return Math.min(min, menuItem.price);
        }, Infinity);
        discount = discountItems * (minPrice * (couponData.discount / 100));
      }
    }
    const total = Math.max(subtotal - discount, 0);

    // Start transaction
    await connection.beginTransaction();
    console.log('Transaction started');

    // Insert into orders
    const [orderResult] = await connection.query(`
      INSERT INTO orders (customer_name, table_number, special_instructions, coupon_code, subtotal, discount, total, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      customer.name.trim().substring(0, 255), // Limit name length
      Number(tableNumber),
      specialInstructions?.trim().substring(0, 1000) || null, // Limit instructions length
      coupon?.trim() || null,
      subtotal,
      discount,
      total
    ]);
    const orderId = orderResult.insertId;
    console.log('Order inserted, orderId:', orderId);

    // Insert into order_items
    const orderItems = items.map(item => [
      orderId,
      Number(item._id),
      Number(item.quantity),
      menuItems.find(m => m.id === Number(item._id)).price
    ]);
    console.log('Order items to insert:', orderItems);

    await connection.query(`
      INSERT INTO order_items (order_id, menu_item_id, quantity, price)
      VALUES ?
    `, [orderItems]);
    console.log('Order items inserted');

    await connection.commit();
    console.log('Transaction committed');

    res.json({ 
      success: true, 
      message: 'Order placed successfully', 
      data: { orderId, subtotal, discount, total } 
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      console.log('Transaction rolled back');
    }
    console.error('Error placing order:', {
      message: error.message,
      sqlMessage: error.sqlMessage,
      sql: error.sql,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: 'Failed to place order', error: error.message });
  } finally {
    if (connection) {
      connection.release();
      console.log('Connection released');
    }
  }
});

module.exports = router;