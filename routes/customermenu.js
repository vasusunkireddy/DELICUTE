// routes/customermenu.js
const express = require("express");
const router = express.Router();
const pool = require("../db"); // centralized pool import

///////////////////////////
// GET Menu Items
///////////////////////////
router.get("/menu", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.id, m.name, m.price, m.description, m.image, 
             m.saved_amount, m.is_top_pick, c.name AS category
      FROM menu_items m
      JOIN categories c ON m.category_id = c.id
      ORDER BY c.name, m.name
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Menu Fetch Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch menu" });
  }
});

///////////////////////////
// GET Active Coupons
///////////////////////////
router.get("/coupons", async (req, res) => {
  try {
    const now = new Date();
    const [rows] = await pool.query(
      `
      SELECT c.id, c.code, c.description, c.image, c.discount, c.quantity, c.type, c.buy_x, 
             c.valid_from, c.valid_to, cat.name AS category
      FROM coupons c
      JOIN categories cat ON c.category_id = cat.id
      WHERE (c.valid_from IS NULL OR c.valid_from <= ?) 
        AND (c.valid_to IS NULL OR c.valid_to >= ?)
    `,
      [now, now]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Coupon Fetch Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch coupons" });
  }
});

///////////////////////////
// POST New Order
///////////////////////////
router.post("/orders", async (req, res) => {
  let conn;
  try {
    const { customer_name, table_number, items, coupon_code } = req.body;

    if (!customer_name || !table_number || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid order data" });
    }

    let subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    let discount = 0;
    let total = subtotal;

    // ====== Apply Coupon Logic (strict per-category) ======
    if (coupon_code) {
      const [cRows] = await pool.query(
        `SELECT c.*, cat.id AS category_id, cat.name AS category_name 
         FROM coupons c 
         JOIN categories cat ON c.category_id = cat.id
         WHERE c.code = ? 
           AND (c.valid_from IS NULL OR c.valid_from <= NOW()) 
           AND (c.valid_to IS NULL OR c.valid_to >= NOW())
         LIMIT 1`,
        [coupon_code]
      );

      if (cRows.length > 0) {
        const coupon = cRows[0];

        // filter items belonging to coupon's category
        const [catItems] = await pool.query(
          `SELECT id FROM menu_items WHERE category_id = ?`,
          [coupon.category_id]
        );
        const catIds = catItems.map(i => i.id);

        const eligibleItems = items.filter(i => catIds.includes(i.id));
        const categorySubtotal = eligibleItems.reduce((sum, i) => sum + i.price * i.qty, 0);
        const categoryQty = eligibleItems.reduce((sum, i) => sum + i.qty, 0);

        if (categorySubtotal > 0) {
          if (coupon.type === "buy_x") {
            if (categoryQty >= coupon.buy_x) {
              discount = (categorySubtotal * coupon.discount) / 100;
            }
          } else {
            // flat percentage on category subtotal
            discount = (categorySubtotal * coupon.discount) / 100;
          }
        }
      }
    }

    total = subtotal - discount;

    // ====== Save order in DB ======
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [orderResult] = await conn.query(
      `INSERT INTO orders 
         (customer_name, table_number, items, coupon_code, subtotal, discount, total, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 'Pending')`,
      [
        customer_name,
        table_number,
        JSON.stringify(items),
        coupon_code || null,
        subtotal,
        discount,
        total,
      ]
    );

    const orderId = orderResult.insertId;

    // order_items table
    const values = items.map(i => [
      orderId,
      i.id,
      i.qty,
      i.price,
      i.price * i.qty,
    ]);
    await conn.query(
      `INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_order, line_total)
       VALUES ?`,
      [values]
    );

    await conn.commit();
    res.json({ success: true, orderId, subtotal, discount, total });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Order Placement Error:", err);
    res.status(500).json({ success: false, message: "Failed to place order", error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
