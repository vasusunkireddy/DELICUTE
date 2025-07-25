const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { body, param, validationResult } = require('express-validator');

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

// === Multer Configuration ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../Uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// === JWT Middleware ===
const authenticate = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT Error:', err.message);
    res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
  }
};

// === Validation Middleware ===
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }
    next();
  };
};

// ========== ORDERS ==========
router.get('/orders', authenticate, async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT o.order_id, o.customer_name, o.customer_email, o.table_number, o.special_instructions, o.status, o.created_at,
             GROUP_CONCAT(CONCAT(oi.item_name, ' (x', oi.quantity, ')', ' - ₹', oi.price)) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      GROUP BY o.order_id
    `);

    res.json({
      success: true,
      data: orders.map(order => ({
        orderId: order.order_id,
        customer: { name: order.customer_name, email: order.customer_email },
        tableNumber: order.table_number || 'N/A',
        items: order.items
          ? order.items.split(',').map(item => {
              const match = item.match(/(.+) \(x(\d+)\) - ₹([\d.]+)/);
              if (match) {
                return { name: match[1], quantity: parseInt(match[2]), price: parseFloat(match[3]) };
              }
              return { name: item.trim(), quantity: 1, price: 0 };
            })
          : [],
        specialInstructions: order.special_instructions || null,
        status: order.status,
        createdAt: order.created_at
      })),
    });
  } catch (err) {
    console.error('Orders Fetch Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

router.get(
  '/orders/:orderId',
  authenticate,
  validate([param('orderId').isInt().withMessage('Order ID must be an integer')]),
  async (req, res) => {
    try {
      const [orders] = await pool.query(`
        SELECT o.order_id, o.customer_name, o.customer_email, o.table_number, o.special_instructions, o.status, o.created_at,
               oi.item_name, oi.quantity, oi.price
        FROM orders o
        LEFT JOIN order_items oi ON o.order_id = oi.order_id
        WHERE o.order_id = ?
      `, [req.params.orderId]);

      if (orders.length === 0) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      const order = orders[0];
      res.json({
        success: true,
        data: {
          orderId: order.order_id,
          customer: { name: order.customer_name, email: order.customer_email },
          tableNumber: order.table_number || 'N/A',
          items: orders.map(item => ({
            name: item.item_name,
            quantity: item.quantity,
            price: parseFloat(item.price)
          })),
          specialInstructions: order.special_instructions || null,
          status: order.status,
          createdAt: order.created_at
        }
      });
    } catch (err) {
      console.error('Order Details Fetch Error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to fetch order details' });
    }
  }
);

router.patch(
  '/orders/:orderId',
  authenticate,
  validate([
    param('orderId').isInt().withMessage('Order ID must be an integer'),
    body('status').isIn(['Pending', 'Confirmed', 'Delivered']).withMessage('Invalid status'),
  ]),
  async (req, res) => {
    try {
      const { status } = req.body;
      const [result] = await pool.query(
        'UPDATE orders SET status = ? WHERE order_id = ?',
        [status, req.params.orderId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      res.json({ success: true, message: 'Order status updated successfully' });
    } catch (err) {
      console.error('Order Update Error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to update order status' });
    }
  }
);

// ========== MENU ==========
router.get('/menu', authenticate, async (req, res) => {
  try {
    const [menu] = await pool.query(`
      SELECT id AS _id, name, description, category, 
             CAST(price AS DECIMAL(10,2)) AS price, 
             CAST(saved_amount AS DECIMAL(10,2)) AS savedAmount, 
             image 
      FROM menu
    `);
    res.json({ success: true, data: menu });
  } catch (err) {
    console.error('Menu Fetch Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch menu' });
  }
});

router.get(
  '/menu/:id',
  authenticate,
  validate([param('id').isInt().withMessage('Menu ID must be an integer')]),
  async (req, res) => {
    try {
      const [items] = await pool.query(`
        SELECT id AS _id, name, description, category, 
               CAST(price AS DECIMAL(10,2)) AS price, 
               CAST(saved_amount AS DECIMAL(10,2)) AS savedAmount, 
               image 
        FROM menu 
        WHERE id = ?
      `, [req.params.id]);

      if (items.length === 0) {
        return res.status(404).json({ success: false, message: 'Menu item not found' });
      }

      res.json({ success: true, data: items[0] });
    } catch (err) {
      console.error('Menu Item Fetch Error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to fetch menu item' });
    }
  }
);

router.post(
  '/menu',
  authenticate,
  upload.single('image'),
  validate([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('savedAmount').optional().isFloat({ min: 0 }).withMessage('Saved amount must be a positive number'),
  ]),
  async (req, res) => {
    try {
      const { name, description, category, price, savedAmount } = req.body;
      const image = req.file ? `/Uploads/${req.file.filename}` : null;

      if (!image) {
        return res.status(400).json({ success: false, message: 'Image is required for new menu items' });
      }

      const [result] = await pool.query(
        'INSERT INTO menu (name, description, category, price, saved_amount, image) VALUES (?, ?, ?, ?, ?, ?)',
        [name, description, category, parseFloat(price), savedAmount ? parseFloat(savedAmount) : null, image]
      );

      res.status(201).json({
        success: true,
        data: {
          _id: result.insertId,
          name,
          description,
          category,
          price: parseFloat(price),
          savedAmount: savedAmount ? parseFloat(savedAmount) : null,
          image
        },
      });
    } catch (err) {
      console.error('Menu Add Error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to add menu item' });
    }
  }
);

router.put(
  '/menu/:id',
  authenticate,
  upload.single('image'),
  validate([
    param('id').isInt().withMessage('Menu ID must be an integer'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('savedAmount').optional().isFloat({ min: 0 }).withMessage('Saved amount must be a positive number'),
    body('existingImage').optional().isString().withMessage('Existing image must be a string'),
  ]),
  async (req, res) => {
    try {
      const { name, description, category, price, savedAmount, existingImage } = req.body;
      const image = req.file ? `/Uploads/${req.file.filename}` : existingImage;

      // Delete old image if a new one is uploaded
      if (req.file && existingImage) {
        const oldImagePath = path.join(__dirname, '..', existingImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      const [result] = await pool.query(
        'UPDATE menu SET name = ?, description = ?, category = ?, price = ?, saved_amount = ?, image = ? WHERE id = ?',
        [name, description, category, parseFloat(price), savedAmount ? parseFloat(savedAmount) : null, image, req.params.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Menu item not found' });
      }

      res.json({
        success: true,
        data: {
          _id: req.params.id,
          name,
          description,
          category,
          price: parseFloat(price),
          savedAmount: savedAmount ? parseFloat(savedAmount) : null,
          image
        },
      });
    } catch (err) {
      console.error('Menu Update Error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to update menu item' });
    }
  }
);

router.delete(
  '/menu/:id',
  authenticate,
  validate([param('id').isInt().withMessage('Menu ID must be an integer')]),
  async (req, res) => {
    try {
      const [item] = await pool.query('SELECT image FROM menu WHERE id = ?', [req.params.id]);
      if (item.length === 0) {
        return res.status(404).json({ success: false, message: 'Menu item not found' });
      }

      if (item[0].image) {
        const imagePath = path.join(__dirname, '..', item[0].image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      const [result] = await pool.query('DELETE FROM menu WHERE id = ?', [req.params.id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Menu item not found' });
      }

      res.json({ success: true, message: 'Menu item deleted successfully' });
    } catch (err) {
      console.error('Menu Delete Error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to delete menu item' });
    }
  }
);

// ========== CATEGORIES ==========
router.get('/categories', authenticate, async (req, res) => {
  try {
    const [categories] = await pool.query('SELECT id AS _id, name FROM categories');
    res.json({ success: true, data: categories });
  } catch (err) {
    console.error('Categories Fetch Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

router.get(
  '/categories/:id',
  authenticate,
  validate([param('id').isInt().withMessage('Category ID must be an integer')]),
  async (req, res) => {
    try {
      const [categories] = await pool.query('SELECT id AS _id, name FROM categories WHERE id = ?', [req.params.id]);
      if (categories.length === 0) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      res.json({ success: true, data: categories[0] });
    } catch (err) {
      console.error('Category Fetch Error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to fetch category' });
    }
  }
);

router.post(
  '/categories',
  authenticate,
  validate([body('name').trim().notEmpty().withMessage('Category name is required')]),
  async (req, res) => {
    try {
      const { name } = req.body;

      const [result] = await pool.query('INSERT INTO categories (name) VALUES (?)', [name]);
      res.status(201).json({ success: true, data: { _id: result.insertId, name } });
    } catch (err) {
      console.error('Category Add Error:', err.message);
      res.status(400).json({
        success: false,
        message: err.code === 'ER_DUP_ENTRY' ? 'Category name already exists' : 'Failed to add category',
      });
    }
  }
);

router.put(
  '/categories/:id',
  authenticate,
  validate([
    param('id').isInt().withMessage('Category ID must be an integer'),
    body('name').trim().notEmpty().withMessage('Category name is required'),
  ]),
  async (req, res) => {
    try {
      const { name } = req.body;

      const [result] = await pool.query('UPDATE categories SET name = ? WHERE id = ?', [name, req.params.id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      res.json({ success: true, data: { _id: req.params.id, name } });
    } catch (err) {
      console.error('Category Update Error:', err.message);
      res.status(400).json({
        success: false,
        message: err.code === 'ER_DUP_ENTRY' ? 'Category name already exists' : 'Failed to update category',
      });
    }
  }
);

router.delete(
  '/categories/:id',
  authenticate,
  validate([param('id').isInt().withMessage('Category ID must be an integer')]),
  async (req, res) => {
    try {
      const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      res.json({ success: true, message: 'Category deleted successfully' });
    } catch (err) {
      console.error('Category Delete Error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to delete category' });
    }
  }
);

// ========== COUPONS ==========
router.get('/coupons', authenticate, async (req, res) => {
  try {
    const [coupons] = await pool.query(`
      SELECT id AS _id, code, description, buy_x, category, 
             valid_from AS validFrom, valid_to AS validTo, image 
      FROM coupons 
      WHERE valid_to >= CURDATE()
    `);
    res.json({ success: true, data: coupons });
  } catch (err) {
    console.error('Coupons Fetch Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch coupons' });
  }
});

router.get(
  '/coupons/:id',
  authenticate,
  validate([param('id').isInt().withMessage('Coupon ID must be an integer')]),
  async (req, res) => {
    try {
      const [coupons] = await pool.query(`
        SELECT id AS _id, code, description, buy_x, category, 
               valid_from AS validFrom, valid_to AS validTo, image 
        FROM coupons 
        WHERE id = ?
      `, [req.params.id]);
      if (coupons.length === 0) {
        return res.status(404).json({ success: false, message: 'Coupon not found' });
      }

      res.json({ success: true, data: coupons[0] });
    } catch (err) {
      console.error('Coupon Fetch Error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to fetch coupon' });
    }
  }
);

router.post(
  '/coupons',
  authenticate,
  upload.single('image'),
  validate([
    body('code').trim().notEmpty().withMessage('Coupon code is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('buy_x').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('validFrom').isISO8601().withMessage('Valid from date is invalid'),
    body('validTo').isISO8601().withMessage('Valid to date is invalid'),
  ]),
  async (req, res) => {
    try {
      const { code, description, buy_x, category, validFrom, validTo } = req.body;
      const image = req.file ? `/Uploads/${req.file.filename}` : null;

      if (!image) {
        return res.status(400).json({ success: false, message: 'Image is required for new coupons' });
      }

      if (new Date(validFrom) > new Date(validTo)) {
        return res.status(400).json({ success: false, message: 'Valid from date cannot be after valid to date' });
      }

      const [result] = await pool.query(
        'INSERT INTO coupons (code, description, buy_x, category, valid_from, valid_to, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [code.toUpperCase(), description, parseInt(buy_x), category, validFrom, validTo, image]
      );

      res.status(201).json({
        success: true,
        data: { _id: result.insertId, code: code.toUpperCase(), description, buy_x: parseInt(buy_x), category, validFrom, validTo, image },
      });
    } catch (err) {
      console.error('Coupon Add Error:', err.message);
      res.status(400).json({
        success: false,
        message: err.code === 'ER_DUP_ENTRY' ? 'Coupon code already exists' : 'Failed to add coupon',
      });
    }
  }
);

router.put(
  '/coupons/:id',
  authenticate,
  upload.single('image'),
  validate([
    param('id').isInt().withMessage('Coupon ID must be an integer'),
    body('code').trim().notEmpty().withMessage('Coupon code is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('buy_x').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('validFrom').isISO8601().withMessage('Valid from date is invalid'),
    body('validTo').isISO8601().withMessage('Valid to date is invalid'),
    body('existingImage').optional().isString().withMessage('Existing image must be a string'),
  ]),
  async (req, res) => {
    try {
      const { code, description, buy_x, category, validFrom, validTo, existingImage } = req.body;
      const image = req.file ? `/Uploads/${req.file.filename}` : existingImage;

      if (new Date(validFrom) > new Date(validTo)) {
        return res.status(400).json({ success: false, message: 'Valid from date cannot be after valid to date' });
      }

      if (req.file && existingImage) {
        const oldImagePath = path.join(__dirname, '..', existingImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      const [result] = await pool.query(
        'UPDATE coupons SET code = ?, description = ?, buy_x = ?, category = ?, valid_from = ?, valid_to = ?, image = ? WHERE id = ?',
        [code.toUpperCase(), description, parseInt(buy_x), category, validFrom, validTo, image, req.params.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Coupon not found' });
      }

      res.json({
        success: true,
        data: {
          _id: req.params.id,
          code: code.toUpperCase(),
          description,
          buy_x: parseInt(buy_x),
          category,
          validFrom,
          validTo,
          image
        },
      });
    } catch (err) {
      console.error('Coupon Update Error:', err.message);
      res.status(400).json({
        success: false,
        message: err.code === 'ER_DUP_ENTRY' ? 'Coupon code already exists' : 'Failed to update coupon',
      });
    }
  }
);

router.delete(
  '/coupons/:id',
  authenticate,
  validate([param('id').isInt().withMessage('Coupon ID must be an integer')]),
  async (req, res) => {
    try {
      const [coupon] = await pool.query('SELECT image FROM coupons WHERE id = ?', [req.params.id]);
      if (coupon.length === 0) {
        return res.status(404).json({ success: false, message: 'Coupon not found' });
      }

      if (coupon[0].image) {
        const imagePath = path.join(__dirname, '..', coupon[0].image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      const [result] = await pool.query('DELETE FROM coupons WHERE id = ?', [req.params.id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Coupon not found' });
      }

      res.json({ success: true, message: 'Coupon deleted successfully' });
    } catch (err) {
      console.error('Coupon Delete Error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to delete coupon' });
    }
  }
);

// ========== TOP PICKS ==========
router.get('/top-picks', authenticate, async (req, res) => {
  try {
    const [topPicks] = await pool.query(`
      SELECT t.id AS _id, m.name, m.category, m.image
      FROM top_picks t
      JOIN menu m ON t.item_id = m.id
    `);
    res.json({ success: true, data: topPicks });
  } catch (err) {
    console.error('Top Picks Fetch Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch top picks' });
  }
});

router.post(
  '/top-picks',
  authenticate,
  validate([body('itemId').isInt().withMessage('Item ID must be an integer')]),
  async (req, res) => {
    try {
      const { itemId } = req.body;

      const [items] = await pool.query('SELECT id FROM menu WHERE id = ?', [itemId]);
      if (items.length === 0) {
        return res.status(404).json({ success: false, message: 'Menu item not found' });
      }

      const [existing] = await pool.query('SELECT id FROM top_picks WHERE item_id = ?', [itemId]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: 'Item is already a top pick' });
      }

      const [result] = await pool.query('INSERT INTO top_picks (item_id) VALUES (?)', [itemId]);
      res.status(201).json({ success: true, data: { _id: result.insertId, itemId } });
    } catch (err) {
      console.error('Top Pick Add Error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to add top pick' });
    }
  }
);

router.delete(
  '/top-picks/:id',
  authenticate,
  validate([param('id').isInt().withMessage('Top Pick ID must be an integer')]),
  async (req, res) => {
    try {
      const [result] = await pool.query('DELETE FROM top_picks WHERE id = ?', [req.params.id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Top pick not found' });
      }

      res.json({ success: true, message: 'Top pick removed successfully' });
    } catch (err) {
      console.error('Top Pick Delete Error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to delete top pick' });
    }
  }
);

module.exports = router;