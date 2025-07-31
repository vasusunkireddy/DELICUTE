// routes/coupons.js
const express = require("express");
const router = express.Router();
const pool = require("../db"); // ✅ your mysql2/promise pool
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");

// ================= CLOUDINARY CONFIG =================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ================= MULTER (for file upload) =================
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper → upload buffer to Cloudinary
async function uploadToCloudinary(fileBuffer, filename) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "coupons", public_id: filename.split(".")[0] },
      (err, result) => {
        if (err) reject(err);
        else resolve(result.secure_url);
      }
    );
    Readable.from(fileBuffer).pipe(uploadStream);
  });
}

// ================= GET ALL COUPONS =================
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.code, c.description, c.image, c.discount, c.quantity,
              c.type, c.buy_x, c.valid_from, c.valid_to,
              cat.name AS category
       FROM coupons c
       JOIN categories cat ON c.category_id = cat.id
       ORDER BY c.id DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Coupons Fetch Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch coupons" });
  }
});

// ================= GET ONE COUPON =================
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, cat.name AS category 
       FROM coupons c 
       JOIN categories cat ON c.category_id = cat.id 
       WHERE c.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: "Coupon not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("Fetch One Coupon Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch coupon" });
  }
});

// ================= CREATE COUPON =================
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const {
      code,
      description,
      discount,
      quantity,
      category, // frontend sends category NAME
      type,
      buy_x,
      valid_from,
      valid_to,
    } = req.body;

    if (!code || !description || !discount || !quantity || !category || !type) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    // ✅ find category_id by category name
    const [catRows] = await pool.query("SELECT id FROM categories WHERE name = ?", [category]);
    if (catRows.length === 0)
      return res.status(400).json({ success: false, message: "Invalid category" });
    const category_id = catRows[0].id;

    // ✅ upload image if present
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer, req.file.originalname);
    }

    await pool.query(
      `INSERT INTO coupons 
        (code, description, image, discount, quantity, category_id, type, buy_x, valid_from, valid_to) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        description,
        imageUrl,
        discount,
        quantity,
        category_id,
        type,
        type === "buy_x" ? buy_x || null : null,
        type === "date_range" ? valid_from || null : null,
        type === "date_range" ? valid_to || null : null,
      ]
    );

    res.json({ success: true, message: "Coupon created successfully" });
  } catch (err) {
    console.error("Coupon Create Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to create coupon" });
  }
});

// ================= UPDATE COUPON =================
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const {
      code,
      description,
      discount,
      quantity,
      category,
      type,
      buy_x,
      valid_from,
      valid_to,
    } = req.body;

    // find category_id
    const [catRows] = await pool.query("SELECT id FROM categories WHERE name = ?", [category]);
    if (catRows.length === 0)
      return res.status(400).json({ success: false, message: "Invalid category" });
    const category_id = catRows[0].id;

    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer, req.file.originalname);
    }

    await pool.query(
      `UPDATE coupons SET 
        code=?, description=?, discount=?, quantity=?, category_id=?, type=?, 
        buy_x=?, valid_from=?, valid_to=?, image=COALESCE(?, image)
       WHERE id=?`,
      [
        code,
        description,
        discount,
        quantity,
        category_id,
        type,
        type === "buy_x" ? buy_x || null : null,
        type === "date_range" ? valid_from || null : null,
        type === "date_range" ? valid_to || null : null,
        imageUrl,
        req.params.id,
      ]
    );

    res.json({ success: true, message: "Coupon updated successfully" });
  } catch (err) {
    console.error("Coupon Update Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to update coupon" });
  }
});

// ================= DELETE COUPON =================
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM coupons WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (err) {
    console.error("Coupon Delete Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to delete coupon" });
  }
});

module.exports = router;
