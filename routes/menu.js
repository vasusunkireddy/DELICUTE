const express = require('express');
const router = express.Router();

// Get menu items
router.get('/menu', async (req, res) => {
  try {
    const [rows] = await req.app.locals.db.query('SELECT * FROM menu_items');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch menu items' });
  }
});

// Get top picks
router.get('/top-picks', async (req, res) => {
  try {
    const [rows] = await req.app.locals.db.query('SELECT * FROM menu_items WHERE is_top_pick = ?', [true]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching top picks:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch top picks' });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await req.app.locals.db.query('SELECT DISTINCT category AS name FROM menu_items');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// Get coupons
router.get('/coupons', async (req, res) => {
  try {
    const [rows] = await req.app.locals.db.query('SELECT * FROM coupons');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch coupons' });
  }
});

// Place an order
router.post('/orders', async (req, res) => {
  const { customer, tableNumber, specialInstructions, items, coupon } = req.body;

  try {
    const [orderResult] = await req.app.locals.db.query(
      'INSERT INTO orders (customer_name, table_number, special_instructions, coupon_code, created_at) VALUES (?, ?, ?, ?, NOW())',
      [customer.name, tableNumber, specialInstructions, coupon]
    );

    const orderId = orderResult.insertId;
    const orderItemsValues = items.map(item => [orderId, item._id, item.quantity, item.price]);
    await req.app.locals.db.query(
      'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ?',
      [orderItemsValues]
    );

    res.json({ success: true, message: 'Order placed successfully', data: { orderId } });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ success: false, message: 'Failed to place order' });
  }
});

module.exports = router;