const express = require('express');
const router = express.Router();

// Middleware to ensure JSON responses
router.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// GET /api/menu - Fetch all menu items
router.get('/menu', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const [rows] = await db.promise().query(`
      SELECT id AS _id, name, description, price, category, image, is_top AS isTop
      FROM menu_items
    `);
    console.log('Menu Data:', rows); // Debugging
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    next(new Error('Failed to fetch menu items'));
  }
});

// GET /api/top-picks - Fetch top pick menu items
router.get('/top-picks', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const [rows] = await db.promise().query(`
      SELECT id AS _id, name, description, price, category, image, is_top AS isTop
      FROM menu_items
      WHERE is_top = TRUE
    `);
    console.log('Top Picks Data:', rows); // Debugging
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching top picks:', error);
    next(new Error('Failed to fetch top picks'));
  }
});

// GET /api/categories - Fetch all categories with menu items
router.get('/categories', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const [rows] = await db.promise().query(`
      SELECT DISTINCT category AS name
      FROM menu_items
      ORDER BY name
    `);
    console.log('Categories Data:', rows); // Debugging
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching categories:', error);
    next(new Error('Failed to fetch categories'));
  }
});

// GET /api/coupons - Fetch all valid coupons
router.get('/api/coupons', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const [rows] = await db.promise().query(`
      SELECT id AS _id, code, description, image, buy_x, discount_percent AS discountPercent, category, valid_from AS validFrom, valid_to AS validTo
      FROM coupons
      WHERE valid_from <= NOW() AND valid_to >= NOW()
    `);
    console.log('Coupons Data:', rows); // Debugging
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    next(new Error('Failed to fetch coupons'));
  }
});

// POST /api/orders - Place a new order
router.post('/api/orders', async (req, res, next) => {
  const { customer, tableNumber, items, specialInstructions, coupon } = req.body;

  if (!customer?.name || !tableNumber || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Missing required fields: customer.name, tableNumber, or items' });
  }

  try {
    const db = req.app.locals.db;

    // Validate items and calculate subtotal
    const itemIds = items.map(item => item._id);
    const [menuItems] = await db.promise().query(`
      SELECT id, name, price, category
      FROM menu_items
      WHERE id IN (?)
    `, [itemIds]);

    if (menuItems.length !== items.length) {
      return res.status(400).json({ success: false, message: 'Invalid or missing menu items' });
    }

    let subtotal = 0;
    const validatedItems = items.map(item => {
      const menuItem = menuItems.find(m => m.id === item._id);
      if (!menuItem || item.quantity <= 0 || isNaN(item.quantity)) {
        throw new Error(`Invalid item or quantity: ${item.name}`);
      }
      if (item.price !== menuItem.price) {
        throw new Error(`Price mismatch for ${item.name}`);
      }
      subtotal += item.quantity * menuItem.price;
      return {
        _id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
        category: menuItem.category
      };
    });

    let total = subtotal;
    let discount = 0;
    let couponCode = null;

    // Validate and apply coupon
    if (coupon) {
      const [couponRows] = await db.promise().query(`
        SELECT code, buy_x, discount_percent, category, valid_from, valid_to
        FROM coupons
        WHERE code = ? AND valid_from <= NOW() AND valid_to >= NOW()
      `, [coupon]);

      if (couponRows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid or expired coupon' });
      }

      const couponData = couponRows[0];
      const eligibleItems = validatedItems.filter(item => item.category === couponData.category);
      const eligibleQuantity = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);

      if (eligibleQuantity < couponData.buy_x) {
        return res.status(400).json({ success: false, message: `Coupon requires ${couponData.buy_x} items from ${couponData.category}` });
      }

      const discountItems = Math.floor(eligibleQuantity / couponData.buy_x);
      const minPrice = eligibleItems.reduce((min, item) => Math.min(min, item.price), Infinity);
      discount = discountItems * (minPrice * (couponData.discount_percent / 100));
      total = Math.max(subtotal - discount, 0);
      couponCode = couponData.code;
    }

    // Insert order
    const [result] = await db.promise().query(
      `INSERT INTO orders (customer_name, table_number, items, special_instructions, coupon_code, total, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [customer.name, tableNumber, JSON.stringify(validatedItems), specialInstructions || '', couponCode, total]
    );

    res.status(201).json({ success: true, data: { orderId: result.insertId, message: 'Order placed successfully' } });
  } catch (error) {
    console.error('Error placing order:', error);
    next(new Error('Failed to place order'));
  }
});

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('API Error:', err.message, err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

module.exports = router;