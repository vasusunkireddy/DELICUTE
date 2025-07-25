const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// === MySQL Pool ===
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production'
    ? { ca: fs.readFileSync(path.join(__dirname, '../ca.pem')) }
    : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// === JWT Middleware ===
const authenticate = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT Error:', err.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// ========== ORDERS ==========
router.get('/orders', authenticate, async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT o.order_id, o.customer_name, o.customer_email, o.special_instructions, o.status,
             GROUP_CONCAT(CONCAT(oi.item_name, ' (x', oi.quantity, ')')) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      GROUP BY o.order_id
    `);

    res.json(orders.map(order => ({
      orderId: order.order_id,
      customer: {
        name: order.customer_name,
        email: order.customer_email,
      },
      items: order.items
        ? order.items.split(',').map(item => {
            const match = item.match(/(.+) \(x(\d+)\)/);
            return match ? { name: match[1], quantity: parseInt(match[2]) } : { name: item, quantity: 1 };
          })
        : [],
      specialInstructions: order.special_instructions,
      status: order.status,
    })));
  } catch (err) {
    console.error('Orders Error:', err.message);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

router.patch('/orders/:orderId', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const [result] = await pool.query(
      'UPDATE orders SET status = ? WHERE order_id = ?',
      [status, req.params.orderId]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Order not found' });

    res.json({ message: 'Order status updated' });
  } catch (err) {
    console.error('Order Update Error:', err.message);
    res.status(500).json({ message: 'Error updating order' });
  }
});

// ========== MENU ==========
router.get('/menu', authenticate, async (req, res) => {
  try {
    const [menu] = await pool.query('SELECT * FROM menu');
    res.json(menu);
  } catch (err) {
    console.error('Menu Error:', err.message);
    res.status(500).json({ message: 'Error fetching menu' });
  }
});

router.get('/menu/:id', authenticate, async (req, res) => {
  try {
    const [items] = await pool.query('SELECT * FROM menu WHERE id = ?', [req.params.id]);
    if (items.length === 0)
      return res.status(404).json({ message: 'Menu item not found' });

    res.json(items[0]);
  } catch (err) {
    console.error('Menu Item Error:', err.message);
    res.status(500).json({ message: 'Error fetching menu item' });
  }
});

router.post('/menu', authenticate, async (req, res) => {
  try {
    const { name, description, category, price, discountPrice, image } = req.body;

    const [result] = await pool.query(
      'INSERT INTO menu (name, description, category, price, discount_price, image) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description, category, price, discountPrice, image]
    );

    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (err) {
    console.error('Menu Add Error:', err.message);
    res.status(400).json({ message: 'Error adding menu item' });
  }
});

router.put('/menu/:id', authenticate, async (req, res) => {
  try {
    const { name, description, category, price, discountPrice, image } = req.body;

    const [result] = await pool.query(
      'UPDATE menu SET name = ?, description = ?, category = ?, price = ?, discount_price = ?, image = ? WHERE id = ?',
      [name, description, category, price, discountPrice, image, req.params.id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Menu item not found' });

    res.json({ id: req.params.id, ...req.body });
  } catch (err) {
    console.error('Menu Update Error:', err.message);
    res.status(400).json({ message: 'Error updating menu item' });
  }
});

router.delete('/menu/:id', authenticate, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM menu WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Menu item not found' });

    res.json({ message: 'Menu item deleted' });
  } catch (err) {
    console.error('Menu Delete Error:', err.message);
    res.status(500).json({ message: 'Error deleting menu item' });
  }
});

// ========== COUPONS ==========
router.get('/coupons', authenticate, async (req, res) => {
  try {
    const [coupons] = await pool.query('SELECT * FROM coupons');
    res.json(coupons);
  } catch (err) {
    console.error('Coupons Error:', err.message);
    res.status(500).json({ message: 'Error fetching coupons' });
  }
});

router.get('/coupons/:id', authenticate, async (req, res) => {
  try {
    const [coupons] = await pool.query('SELECT * FROM coupons WHERE id = ?', [req.params.id]);
    if (coupons.length === 0)
      return res.status(404).json({ message: 'Coupon not found' });

    res.json(coupons[0]);
  } catch (err) {
    console.error('Coupon Error:', err.message);
    res.status(500).json({ message: 'Error fetching coupon' });
  }
});

router.post('/coupons', authenticate, async (req, res) => {
  try {
    const { code, description, logic, validFrom, validTo } = req.body;

    const [result] = await pool.query(
      'INSERT INTO coupons (code, description, logic, valid_from, valid_to) VALUES (?, ?, ?, ?, ?)',
      [code.toUpperCase(), description, logic, validFrom, validTo]
    );

    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (err) {
    console.error('Coupon Add Error:', err.message);
    res.status(400).json({
      message: err.code === 'ER_DUP_ENTRY' ? 'Coupon code already exists' : 'Error adding coupon',
    });
  }
});

router.put('/coupons/:id', authenticate, async (req, res) => {
  try {
    const { code, description, logic, validFrom, validTo } = req.body;

    const [result] = await pool.query(
      'UPDATE coupons SET code = ?, description = ?, logic = ?, valid_from = ?, valid_to = ? WHERE id = ?',
      [code.toUpperCase(), description, logic, validFrom, validTo, req.params.id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Coupon not found' });

    res.json({ id: req.params.id, ...req.body });
  } catch (err) {
    console.error('Coupon Update Error:', err.message);
    res.status(400).json({ message: 'Error updating coupon' });
  }
});

router.delete('/coupons/:id', authenticate, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM coupons WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Coupon not found' });

    res.json({ message: 'Coupon deleted' });
  } catch (err) {
    console.error('Coupon Delete Error:', err.message);
    res.status(500).json({ message: 'Error deleting coupon' });
  }
});

// ========== TOP PICKS ==========
router.get('/top-picks', authenticate, async (req, res) => {
  try {
    const [topPicks] = await pool.query(`
      SELECT m.* FROM top_picks tp
      JOIN menu m ON tp.item_id = m.id
    `);
    res.json(topPicks);
  } catch (err) {
    console.error('Top Picks Error:', err.message);
    res.status(500).json({ message: 'Error fetching top picks' });
  }
});

router.post('/top-picks', authenticate, async (req, res) => {
  try {
    const { itemId } = req.body;

    await pool.query('INSERT INTO top_picks (item_id) VALUES (?)', [itemId]);
    const [item] = await pool.query('SELECT * FROM menu WHERE id = ?', [itemId]);

    res.status(201).json(item[0]);
  } catch (err) {
    console.error('Top Pick Add Error:', err.message);
    res.status(400).json({ message: 'Error adding top pick' });
  }
});

router.delete('/top-picks/:id', authenticate, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM top_picks WHERE item_id = ?', [req.params.id]);

    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Top pick not found' });

    res.json({ message: 'Top pick removed' });
  } catch (err) {
    console.error('Top Pick Delete Error:', err.message);
    res.status(500).json({ message: 'Error removing top pick' });
  }
});

module.exports = router;
