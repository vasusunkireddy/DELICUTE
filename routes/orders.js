const express = require("express");
const router = express.Router();
const pool = require("../db"); // MySQL pool
const authenticate = require("../middleware/authenticate");

// ================== CREATE ORDER ==================
router.post("/", async (req, res) => {
  const { customer_name, table_number, items, coupon_code, subtotal, discount, total, instructions } = req.body;

  // Validate request
  if (!customer_name || !table_number || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  // Normalize items to ensure qty
  const normalizedItems = items.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    qty: item.qty || 1 // Fallback to 1 if qty is missing
  }));

  try {
    const [result] = await pool.query(
      "INSERT INTO orders (customer_name, table_number, items, coupon_code, subtotal, discount, total, instructions, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())",
      [
        customer_name,
        table_number,
        JSON.stringify(normalizedItems),
        coupon_code || null,
        subtotal,
        discount || 0,
        total,
        instructions || ""
      ]
    );

    res.json({ success: true, orderId: result.insertId });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ success: false, message: "Failed to create order" });
  }
});

// ================== GET ALL ORDERS ==================
router.get("/", authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT o.id, o.customer_name, o.table_number, o.total, 
             o.status, o.items, o.instructions, o.created_at
      FROM orders o
      ORDER BY o.created_at DESC
    `);

    // Parse items and normalize qty
    const orders = rows.map(order => {
      let items;
      try {
        items = JSON.parse(order.items).map(item => ({
          ...item,
          qty: item.qty ?? item.quantity ?? 1 // Fallback to quantity or 1
        }));
      } catch {
        items = order.items; // Fallback if not JSON
      }
      return { ...order, items, instructions: order.instructions || "" };
    });

    res.json({ success: true, data: orders });
  } catch (err) {
    console.error("Get orders error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
});

// ================== CANCEL ORDER ==================
router.put("/:id/cancel", authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      "UPDATE orders SET status = 'Cancelled' WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, message: "Order cancelled successfully" });
  } catch (err) {
    console.error("Cancel order error:", err);
    res.status(500).json({ success: false, message: "Failed to cancel order" });
  }
});

// ================== DELETE ORDER ==================
router.delete("/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM orders WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, message: "Order deleted successfully" });
  } catch (err) {
    console.error("Delete order error:", err);
    res.status(500).json({ success: false, message: "Failed to delete order" });
  }
});

// ================== UPDATE STATUS (Pending → Preparing → Delivered) ==================
router.put("/:id/status", authenticate, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ["Pending", "Preparing", "Delivered", "Cancelled"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  try {
    const [result] = await pool.query(
      "UPDATE orders SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, message: `Order marked as ${status}` });
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ success: false, message: "Failed to update status" });
  }
});

module.exports = router;
