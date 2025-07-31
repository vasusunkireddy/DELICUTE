// routes/orders.js
const express = require("express");
const router = express.Router();
const pool = require("../db"); // MySQL pool
const authenticate = require("../middleware/authenticate");

// ================== GET ALL ORDERS ==================
// ================== GET ALL ORDERS ==================
router.get("/", authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT o.id, o.customer_name, o.table_number, o.total, 
             o.status, o.items, o.created_at
      FROM orders o
      ORDER BY o.created_at DESC
    `);

    // Parse items if JSON
    const orders = rows.map(order => {
      let items;
      try {
        items = JSON.parse(order.items);
      } catch {
        items = order.items; // fallback if not JSON
      }
      return { ...order, items };
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
