const express = require('express');
const router = express.Router();

// GET /api/menu - Fetch all menu items
router.get('/menu', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const [rows] = await db.promise().query(`
      SELECT id, name, description, price, category, image, is_top
      FROM menu_items
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    next(new Error('Failed to fetch menu items'));
  }
});

// POST /api/orders - Place a new order
router.post('/orders', async (req, res, next) => {
  const { customerName, tableNumber, items, total } = req.body;

  if (!customerName || !tableNumber || !items || items.length === 0) {
    return res.status(400).json({ message: 'Missing required fields: customerName, tableNumber, or items' });
  }

  try {
    const db = req.app.locals.db;
    const [result] = await db.promise().query(
      `INSERT INTO orders (customer_name, table_number, items, total, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [customerName, tableNumber, JSON.stringify(items), total]
    );
    res.status(201).json({ message: 'Order placed successfully', orderId: result.insertId });
  } catch (error) {
    console.error('Error placing order:', error);
    next(new Error('Failed to place order'));
  }
});

module.exports = router;