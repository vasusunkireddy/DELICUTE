const express = require("express");
const router = express.Router();
const pool = require("../db");
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

// Valid coupon types
const VALID_COUPON_TYPES = ['buy_x', 'date_range', 'min_cart_amount', 'bogo'];

// ================= GET ALL COUPONS =================
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.code, c.description, c.image, c.discount, c.quantity,
              c.type, c.buy_x, c.valid_from, c.valid_to, c.min_cart_amount,
              cat.name AS category
       FROM coupons c
       LEFT JOIN categories cat ON c.category_id = cat.id
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
       LEFT JOIN categories cat ON c.category_id = cat.id 
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
      category,
      type,
      buy_x,
      valid_from,
      valid_to,
      min_cart_amount,
    } = req.body;

    if (!code || !description || !type) {
      return res.status(400).json({ success: false, message: "Code, description, and type are required" });
    }

    if (!VALID_COUPON_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid coupon type" });
    }

    if (type === "min_cart_amount" && !min_cart_amount) {
      return res.status(400).json({ success: false, message: "Minimum cart amount is required for Min Cart Amount type" });
    }

    if (type !== "min_cart_amount" && !quantity) {
      return res.status(400).json({ success: false, message: "Quantity is required for this coupon type" });
    }

    let category_id = null;
    if (type !== "min_cart_amount") {
      if (!category) {
        return res.status(400).json({ success: false, message: "Category is required for this coupon type" });
      }
      const [catRows] = await pool.query("SELECT id FROM categories WHERE name = ?", [category]);
      if (catRows.length === 0)
        return res.status(400).json({ success: false, message: "Invalid category" });
      category_id = catRows[0].id;
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer, req.file.originalname);
    }

    const discountValue = type === "bogo" ? 0 : (discount || null);

    await pool.query(
      `INSERT INTO coupons 
        (code, description, image, discount, quantity, category_id, type, buy_x, valid_from, valid_to, min_cart_amount) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        description,
        imageUrl,
        discountValue,
        quantity || null,
        category_id,
        type,
        type === "buy_x" ? buy_x || null : null,
        type === "date_range" ? valid_from || null : null,
        type === "date_range" ? valid_to || null : null,
        type === "min_cart_amount" ? min_cart_amount || null : null,
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
      min_cart_amount,
    } = req.body;

    if (!code || !description || !type) {
      return res.status(400).json({ success: false, message: "Code, description, and type are required" });
    }

    if (!VALID_COUPON_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid coupon type" });
    }

    if (type === "min_cart_amount" && !min_cart_amount) {
      return res.status(400).json({ success: false, message: "Minimum cart amount is required for Min Cart Amount type" });
    }

    if (type !== "min_cart_amount" && !quantity) {
      return res.status(400).json({ success: false, message: "Quantity is required for this coupon type" });
    }

    let category_id = null;
    if (type !== "min_cart_amount") {
      if (!category) {
        return res.status(400).json({ success: false, message: "Category is required for this coupon type" });
      }
      const [catRows] = await pool.query("SELECT id FROM categories WHERE name = ?", [category]);
      if (catRows.length === 0)
        return res.status(400).json({ success: false, message: "Invalid category" });
      category_id = catRows[0].id;
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer, req.file.originalname);
    }

    const discountValue = type === "bogo" ? 0 : (discount || null);

    await pool.query(
      `UPDATE coupons SET 
        code=?, description=?, discount=?, quantity=?, category_id=?, type=?, 
        buy_x=?, valid_from=?, valid_to=?, min_cart_amount=?, image=COALESCE(?, image)
       WHERE id=?`,
      [
        code,
        description,
        discountValue,
        quantity || null,
        category_id,
        type,
        type === "buy_x" ? buy_x || null : null,
        type === "date_range" ? valid_from || null : null,
        type === "date_range" ? valid_to || null : null,
        type === "min_cart_amount" ? min_cart_amount || null : null,
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
    const [result] = await pool.query("DELETE FROM coupons WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }
    res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (err) {
    console.error("Coupon Delete Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to delete coupon" });
  }
});

module.exports = router;