const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const fs = require('fs/promises');
const path = require('path');
const multer = require('multer');
const { body, param, validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;

const router = express.Router();

// === Configure Cloudinary ===
const configureCloudinary = () => {
  const requiredEnvVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Environment variable ${envVar} is not set`);
    }
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

// === MySQL Pool ===
const initializePool = async () => {
  try {
    const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Environment variable ${envVar} is not set`);
      }
    }

    const config = {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };

    if (process.env.NODE_ENV === 'production') {
      try {
        const caCert = await fs.readFile(path.join(__dirname, '../ca.pem'), 'utf8');
        config.ssl = { ca: caCert };
      } catch (err) {
        console.error('Failed to read ca.pem for SSL:', { message: err.message });
        throw new Error('Unable to load SSL certificate');
      }
    }

    return mysql.createPool(config);
  } catch (err) {
    console.error('Failed to initialize MySQL pool:', { message: err.message });
    throw err;
  }
};

// Initialize Cloudinary and MySQL pool
configureCloudinary();
let pool;
initializePool()
  .then(createdPool => {
    pool = createdPool;
    console.log('MySQL connection pool initialized successfully');
  })
  .catch(err => {
    console.error('Error initializing MySQL pool:', { message: err.message });
    process.exit(1); // Exit process if pool initialization fails
  });

// === Multer Configuration ===
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../Uploads');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      console.log('Created Uploads folder:', uploadPath);
      cb(null, uploadPath);
    } catch (err) {
      console.error('Failed to create Uploads folder:', { message: err.message });
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, or GIF images are allowed'), false);
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
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not set in environment');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT Error:', { message: err.message, stack: err.stack });
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
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

// === Custom ID Validator ===
const isValidId = (value, { req, location, path }) => {
  if (!value || value === 'undefined' || value === '') {
    throw new Error(`${path} cannot be undefined or empty`);
  }
  const parsed = Number(value);
  if (isNaN(parsed) || parsed < 1 || !Number.isInteger(parsed)) {
    throw new Error(`${path} must be a valid positive integer or a string representing one`);
  }
  req.sanitizedId = parsed;
  return true;
};

// === Utility Function to Clean Up Files ===
const cleanupFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    console.log('Cleaned up file:', filePath);
  } catch (err) {
    console.error('File Cleanup Error:', { message: err.message });
  }
};

// === Utility Function to Destroy Cloudinary Image ===
const destroyCloudinaryImage = async (imageUrl) => {
  if (imageUrl && imageUrl.includes('cloudinary.com')) {
    const publicId = imageUrl.split('/').pop().split('.')[0];
    try {
      await cloudinary.uploader.destroy(`delicutee/${publicId}`);
      console.log('Destroyed Cloudinary image:', `delicutee/${publicId}`);
    } catch (err) {
      console.error('Cloudinary Destroy Error:', { message: err.message });
    }
  }
};

// ========== ORDERS ==========
router.get('/orders', authenticate, async (req, res) => {
  let connection;
  try {
    if (!pool) throw new Error('Database pool not initialized');
    connection = await pool.getConnection();
    const [orders] = await connection.query(`
      SELECT o.id AS order_id, o.customer_name, o.table_number, o.special_instructions, o.status, o.created_at,
             GROUP_CONCAT(CONCAT(m.name, ' (x', oi.quantity, ')', ' - ₹', oi.price)) AS items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu m ON oi.menu_item_id = m.id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);

    res.json({
      success: true,
      data: orders.map(order => ({
        orderId: String(order.order_id),
        customer: { name: order.customer_name || 'Unknown' },
        tableNumber: order.table_number || 'N/A',
        items: order.items
          ? order.items.split(',').map(item => {
              const match = item.match(/(.+) \(x(\d+)\) - ₹([\d.]+)/);
              return match
                ? { name: match[1], quantity: parseInt(match[2]), price: parseFloat(match[3]) }
                : { name: item.trim(), quantity: 1, price: 0 };
            })
          : [],
        specialInstructions: order.special_instructions || null,
        status: order.status || 'Pending',
        createdAt: order.created_at.toISOString(),
      })),
    });
  } catch (err) {
    console.error('Orders Fetch Error:', { message: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: 'Failed to fetch orders', error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

router.get(
  '/orders/:orderId',
  authenticate,
  validate([param('orderId').custom(isValidId).withMessage('Order ID must be a valid positive integer')]),
  async (req, res) => {
    let connection;
    try {
      if (!pool) throw new Error('Database pool not initialized');
      connection = await pool.getConnection();
      const [orders] = await connection.query(`
        SELECT o.id AS order_id, o.customer_name, o.table_number, o.special_instructions, o.status, o.created_at,
               m.name AS item_name, oi.quantity, oi.price
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN menu m ON oi.menu_item_id = m.id
        WHERE o.id = ?
      `, [req.sanitizedId]);

      if (!orders.length) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      const order = orders[0];
      res.json({
        success: true,
        data: {
          orderId: String(order.order_id),
          customer: { name: order.customer_name || 'Unknown' },
          tableNumber: order.table_number || 'N/A',
          items: orders.map(item => ({
            name: item.item_name || 'Unknown Item',
            quantity: item.quantity || 1,
            price: parseFloat(item.price) || 0,
          })),
          specialInstructions: order.special_instructions || null,
          status: order.status || 'Pending',
          createdAt: order.created_at.toISOString(),
        },
      });
    } catch (err) {
      console.error('Order Details Fetch Error:', { message: err.message, stack: err.stack });
      res.status(500).json({ success: false, message: 'Failed to fetch order details', error: err.message });
    } finally {
      if (connection) connection.release();
    }
  }
);

router.patch(
  '/orders/:orderId',
  authenticate,
  validate([
    param('orderId').custom(isValidId).withMessage('Order ID must be a valid positive integer'),
    body('status').isIn(['Pending', 'Confirmed', 'Delivered']).withMessage('Invalid status'),
  ]),
  async (req, res) => {
    let connection;
    try {
      if (!pool) throw new Error('Database pool not initialized');
      connection = await pool.getConnection();
      const { status } = req.body;
      const [result] = await connection.query(
        'UPDATE orders SET status = ? WHERE id = ?',
        [status, req.sanitizedId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      res.json({ success: true, message: 'Order status updated successfully' });
    } catch (err) {
      console.error('Order Update Error:', { message: err.message, stack: err.stack });
      res.status(500).json({ success: false, message: 'Failed to update order status', error: err.message });
    } finally {
      if (connection) connection.release();
    }
  }
);

// ========== MENU ==========
router.get('/menu', authenticate, async (req, res) => {
  let connection;
  try {
    if (!pool) throw new Error('Database pool not initialized');
    connection = await pool.getConnection();
    const [menu] = await connection.query(`
      SELECT id AS _id, name, description, category, 
             CAST(price AS DECIMAL(10,2)) AS price, 
             CAST(saved_amount AS DECIMAL(10,2)) AS savedAmount, 
             image 
      FROM menu
      ORDER BY name ASC
    `);
    res.json({
      success: true,
      data: menu.map(item => ({
        ...item,
        _id: String(item._id),
        price: parseFloat(item.price),
        savedAmount: item.savedAmount ? parseFloat(item.savedAmount) : null,
      })),
    });
  } catch (err) {
    console.error('Menu Fetch Error:', { message: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: 'Failed to fetch menu', error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

router.get(
  '/menu/:id',
  authenticate,
  validate([param('id').custom(isValidId).withMessage('Menu ID must be a valid positive integer')]),
  async (req, res) => {
    let connection;
    try {
      if (!pool) throw new Error('Database pool not initialized');
      connection = await pool.getConnection();
      const [items] = await connection.query(`
        SELECT id AS _id, name, description, category, 
               CAST(price AS DECIMAL(10,2)) AS price, 
               CAST(saved_amount AS DECIMAL(10,2)) AS savedAmount, 
               image 
        FROM menu 
        WHERE id = ?
      `, [req.sanitizedId]);

      if (!items.length) {
        return res.status(404).json({ success: false, message: 'Menu item not found' });
      }

      const item = items[0];
      res.json({
        success: true,
        data: {
          ...item,
          _id: String(item._id),
          price: parseFloat(item.price),
          savedAmount: item.savedAmount ? parseFloat(item.savedAmount) : null,
        },
      });
    } catch (err) {
      console.error('Menu Item Fetch Error:', { message: err.message, stack: err.stack });
      res.status(500).json({ success: false, message: 'Failed to fetch menu item', error: err.message });
    } finally {
      if (connection) connection.release();
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
    let connection;
    try {
      if (!pool) throw new Error('Database pool not initialized');
      connection = await pool.getConnection();
      const { name, description, category, price, savedAmount } = req.body;

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Image is required for new menu items' });
      }

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'delicutee/menu',
      });

      await cleanupFile(req.file.path);

      const imageUrl = result.secure_url;

      const [resultDb] = await connection.query(
        'INSERT INTO menu (name, description, category, price, saved_amount, image) VALUES (?, ?, ?, ?, ?, ?)',
        [name, description, category, parseFloat(price), savedAmount ? parseFloat(savedAmount) : null, imageUrl]
      );

      res.status(201).json({
        success: true,
        data: {
          _id: String(resultDb.insertId),
          name,
          description,
          category,
          price: parseFloat(price),
          savedAmount: savedAmount ? parseFloat(savedAmount) : null,
          image: imageUrl,
        },
      });
    } catch (err) {
      if (req.file) await cleanupFile(req.file.path);
      console.error('Menu Add Error:', { message: err.message, stack: err.stack });
      res.status(500).json({ success: false, message: 'Failed to add menu item', error: err.message });
    } finally {
      if (connection) connection.release();
    }
  }
);

router.put(
  '/menu/:id',
  authenticate,
  upload.single('image'),
  validate([
    param('id').custom(isValidId).withMessage('Menu ID must be a valid positive integer'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('savedAmount').optional().isFloat({ min: 0 }).withMessage('Saved amount must be a positive number'),
    body('existingImage').optional().isString().withMessage('Existing image must be a valid URL'),
  ]),
  async (req, res) => {
    let connection;
    try {
      if (!pool) throw new Error('Database pool not initialized');
      connection = await pool.getConnection();
      const { name, description, category, price, savedAmount, existingImage } = req.body;
      let image = existingImage;

      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'delicutee/menu',
        });
        image = result.secure_url;
        await cleanupFile(req.file.path);

        if (existingImage) {
          await destroyCloudinaryImage(existingImage);
        }
      } else if (!image) {
        return res.status(400).json({ success: false, message: 'Image is required' });
      }

      const [result] = await connection.query(
        'UPDATE menu SET name = ?, description = ?, category = ?, price = ?, saved_amount = ?, image = ? WHERE id = ?',
        [name, description, category, parseFloat(price), savedAmount ? parseFloat(savedAmount) : null, image, req.sanitizedId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Menu item not found' });
      }

      res.json({
        success: true,
        data: {
          _id: String(req.sanitizedId),
          name,
          description,
          category,
          price: parseFloat(price),
          savedAmount: savedAmount ? parseFloat(savedAmount) : null,
          image,
        },
      });
    } catch (err) {
      if (req.file) await cleanupFile(req.file.path);
      console.error('Menu Update Error:', { message: err.message, stack: err.stack });
      res.status(500).json({ success: false, message: 'Failed to update menu item', error: err.message });
    } finally {
      if (connection) connection.release();
    }
  }
);

router.delete(
  '/menu/:id',
  authenticate,
  validate([param('id').custom(isValidId).withMessage('Menu ID must be a valid positive integer')]),
  async (req, res) => {
    let connection;
    try {
      if (!pool) throw new Error('Database pool not initialized');
      connection = await pool.getConnection();
      const [item] = await connection.query('SELECT image FROM menu WHERE id = ?', [req.sanitizedId]);
      if (!item.length) {
        return res.status(404).json({ success: false, message: 'Menu item not found' });
      }

      await destroyCloudinaryImage(item[0].image);

      const [result] = await connection.query('DELETE FROM menu WHERE id = ?', [req.sanitizedId]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Menu item not found' });
      }

      res.json({ success: true, message: 'Menu item deleted successfully' });
    } catch (err) {
      console.error('Menu Delete Error:', { message: err.message, stack: err.stack });
      res.status(500).json({ success: false, message: 'Failed to delete menu item', error: err.message });
    } finally {
      if (connection) connection.release();
    }
  }
);

// ========== CATEGORIES ==========
router.get('/categories', authenticate, async (req, res) => {
  let connection;
  try {
    if (!pool) throw new Error('Database pool not initialized');
    connection = await pool.getConnection();
    const [categories] = await connection.query('SELECT id AS _id, name FROM categories ORDER BY name ASC');
    res.json({
      success: true,
      data: categories.map(category => ({ ...category, _id: String(category._id) })),
    });
  } catch (err) {
    console.error('Categories Fetch Error:', { message: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: 'Failed to fetch categories', error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

router.get(
  '/categories/:id',
  authenticate,
  validate([param('id').custom(isValidId).withMessage('Category ID must be a valid positive integer')]),
  async (req, res) => {
    let connection;
    try {
      if (!pool) throw new Error('Database pool not initialized');
      connection = await pool.getConnection();
      const [categories] = await connection.query('SELECT id AS _id, name FROM categories WHERE id = ?', [req.sanitizedId]);
      if (!categories.length) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      res.json({
        success: true,
        data: { ...categories[0], _id: String(categories[0]._id) },
      });
    } catch (err) {
      console.error('Category Fetch Error:', { message: err.message, stack: err.stack });
      res.status(500).json({ success: false, message: 'Failed to fetch category', error: err.message });
    } finally {
      if (connection) connection.release();
    }
  }
);

router.post(
  '/categories',
  authenticate,
  validate([body('name').trim().notEmpty().withMessage('Category name is required')]),
  async (req, res) => {
    let connection;
    try {
      if (!pool) throw new Error('Database pool not initialized');
      connection = await pool.getConnection();
      const { name } = req.body;

      const [result] = await connection.query('INSERT INTO categories (name) VALUES (?)', [name]);
      res.status(201).json({
        success: true,
        data: { _id: String(result.insertId), name },
      });
    } catch (err) {
      console.error('Category Add Error:', { message: err.message, stack: err.stack });
      res.status(400).json({
        success: false,
        message: err.code === 'ER_DUP_ENTRY' ? 'Category name already exists' : 'Failed to add category',
        error: err.message,
      });
    } finally {
      if (connection) connection.release();
    }
  }
);

router.put(
  '/categories/:id',
  authenticate,
  validate([
    param('id').custom(isValidId).withMessage('Category ID must be a valid positive integer'),
    body('name').trim().notEmpty().withMessage('Category name is required'),
  ]),
  async (req, res) => {
    let connection;
    try {
      if (!pool) throw new Error('Database pool not initialized');
      connection = await pool.getConnection();
      const { name } = req.body;

      const [result] = await connection.query('UPDATE categories SET name = ? WHERE id = ?', [name, req.sanitizedId]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      res.json({
        success: true,
        data: { _id: String(req.sanitizedId), name },
      });
    } catch (err) {
      console.error('Category Update Error:', { message: err.message, stack: err.stack });
      res.status(400).json({
        success: false,
        message: err.code === 'ER_DUP_ENTRY' ? 'Category name already exists' : 'Failed to update category',
        error: err.message,
      });
    } finally {
      if (connection) connection.release();
    }
  }
);

router.delete(
  '/categories/:id',
  authenticate,
  validate([param('id').custom(isValidId).withMessage('Category ID must be a valid positive integer')]),
  async (req, res) => {
    let connection;
    try {
      if (!pool) throw new Error('Database pool not initialized');
      connection = await pool.getConnection();
      const [menuItems] = await connection.query('SELECT id FROM menu WHERE category = (SELECT name FROM categories WHERE id = ?)', [req.sanitizedId]);
      const [coupons] = await connection.query('SELECT id FROM coupons WHERE category = (SELECT name FROM categories WHERE id = ?)', [req.sanitizedId]);

      if (menuItems.length > 0 || coupons.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete category with associated menu items or coupons',
        });
      }

      const [result] = await connection.query('DELETE FROM categories WHERE id = ?', [req.sanitizedId]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      res.json({ success: true, message: 'Category deleted successfully' });
    } catch (err) {
      console.error('Category Delete Error:', { message: err.message, stack: err.stack });
      res.status(500).json({ success: false, message: 'Failed to delete category', error: err.message });
    } finally {
      if (connection) connection.release();
    }
  }
);

// ========== COUPONS ==========
router.get('/coupons', authenticate, async (req, res) => {
  let connection;
  try {
    if (!pool) throw new Error('Database pool not initialized');
    connection = await pool.getConnection();
    const [coupons] = await connection.query(`
      SELECT id AS _id, code, description, buy_x, discount, category, 
             valid_from AS validFrom, valid_to AS validTo, image 
      FROM coupons 
      ORDER BY valid_from DESC
    `);
    res.json({
      success: true,
      data: coupons.map(coupon => ({
        ...coupon,
        _id: String(coupon._id),
        buy_x: parseInt(coupon.buy_x),
        discount: coupon.discount ? parseInt(coupon.discount) : null,
        validFrom: coupon.validFrom.toISOString().split('T')[0],
        validTo: coupon.validTo.toISOString().split('T')[0],
      })),
    });
  } catch (err) {
    console.error('Coupons Fetch Error:', { message: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: 'Failed to fetch coupons', error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

router.get(
  '/coupons/:id',
  authenticate,
  validate([param('id').custom(isValidId).withMessage('Coupon ID must be a valid positive integer')]),
  async (req, res) => {
    let connection;
    try {
      if (!pool) throw new Error('Database pool not initialized');
      connection = await pool.getConnection();
      const [coupons] = await connection.query(`
        SELECT id AS _id, code, description, buy_x, discount, category, 
               valid_from AS validFrom, valid_to AS validTo, image 
        FROM coupons 
        WHERE id = ?
      `, [req.sanitizedId]);

      if (!coupons.length) {
        return res.status(404).json({ success: false, message: 'Coupon not found' });
      }

      const coupon = coupons[0];
      res.json({
        success: true,
        data: {
          ...coupon,
          _id: String(coupon._id),
          buy_x: parseInt(coupon.buy_x),
          discount: coupon.discount ? parseInt(coupon.discount) : null,
          validFrom: coupon.validFrom.toISOString().split('T')[0],
          validTo: coupon.validTo.toISOString().split('T')[0],
        },
      });
    } catch (err) {
      console.error('Coupon Fetch Error:', { message: err.message, stack: err.stack });
      res.status(500).json({ success: false, message: 'Failed to fetch coupon', error: err.message });
    } finally {
      if (connection) connection.release();
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
    body('discount').isInt({ min: 1, max: 100 }).withMessage('Discount must be an integer between 1 and 100'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('validFrom').isISO8601().withMessage('Valid from date is invalid'),
    body('validTo').isISO8601().withMessage('Valid to date is invalid'),
  ]),
  async (req, res) => {
    let connection;
    try {
      if (!pool) throw new Error('Database pool not initialized');
      connection = await pool.getConnection();
      const { code, description, buy_x, discount, category, validFrom, validTo } = req.body;

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Image is required for new coupons' });
      }

      if (new Date(validFrom) > new Date(validTo)) {
        return res.status(400).json({ success: false, message: 'Valid from date cannot be after valid to date' });
      }

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'delicutee/coupons',
      });

      await cleanupFile(req.file.path);

      const imageUrl = result.secure_url;

      const [resultDb] = await connection.query(
        'INSERT INTO coupons (code, description, buy_x, discount, category, valid_from, valid_to, image, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [code.toUpperCase(), description, parseInt(buy_x), parseInt(discount), category, validFrom, validTo, imageUrl, true]
      );

      res.status(201).json({
        success: true,
        data: {
          _id: String(resultDb.insertId),
          code: code.toUpperCase(),
          description,
          buy_x: parseInt(buy_x),
          discount: parseInt(discount),
          category,
          validFrom: new Date(validFrom).toISOString().split('T')[0],
          validTo: new Date(validTo).toISOString().split('T')[0],
          image: imageUrl,
        },
      });
    } catch (err) {
      if (req.file) await cleanupFile(req.file.path);
      console.error('Coupon Add Error:', { message: err.message, stack: err.stack });
      res.status(400).json({
        success: false,
        message: err.code === 'ER_DUP_ENTRY' ? 'Coupon code already exists' : 'Failed to add coupon',
        error: err.message,
      });
    } finally {
      if (connection) connection.release();
    }
  }
);

router.put(
  '/coupons/:id',
  authenticate,
  upload.single('image'),
  validate([
    param('id').custom(isValidId).withMessage('Coupon ID must be a valid positive integer'),
    body('code').trim().notEmpty().withMessage('Coupon code is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('buy_x').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('discount').isInt({ min: 1, max: 100 }).withMessage('Discount must be an integer between 1 and 100'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('validFrom').isISO8601().withMessage('Valid from date is invalid'),
    body('validTo').isISO8601().withMessage('Valid to date is invalid'),
    body('existingImage').optional().isString().withMessage('Existing image must be a valid URL'),
  ]),
  async (req, res) => {
    let connection;
    try {
      if (!pool) throw new Error('Database pool not initialized');
      connection = await pool.getConnection();
      const { code, description, buy_x, discount, category, validFrom, validTo, existingImage } = req.body;
      let image = existingImage;

      if (new Date(validFrom) > new Date(validTo)) {
        return res.status(400).json({ success: false, message: 'Valid from date cannot be after valid to date' });
      }

      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'delicutee/coupons',
        });
        image = result.secure_url;
        await cleanupFile(req.file.path);

        if (existingImage) {
          await destroyCloudinaryImage(existingImage);
        }
      } else if (!image) {
        return res.status(400).json({ success: false, message: 'Image is required' });
      }

      const [result] = await connection.query(
        'UPDATE coupons SET code = ?, description = ?, buy_x = ?, discount = ?, category = ?, valid_from = ?, valid_to = ?, image = ? WHERE id = ?',
        [code.toUpperCase(), description, parseInt(buy_x), parseInt(discount), category, validFrom, validTo, image, req.sanitizedId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Coupon not found' });
      }

      res.json({
        success: true,
        data: {
          _id: String(req.sanitizedId),
          code: code.toUpperCase(),
          description,
          buy_x: parseInt(buy_x),
          discount: parseInt(discount),
          category,
          validFrom: new Date(validFrom).toISOString().split('T')[0],
          validTo: new Date(validTo).toISOString().split('T')[0],
          image,
        },
      });
    } catch (err) {
      if (req.file) await cleanupFile(req.file.path);
      console.error('Coupon Update Error:', { message: err.message, stack: err.stack });
      res.status(400).json({
        success: false,
        message: err.code === 'ER_DUP_ENTRY' ? 'Coupon code already exists' : 'Failed to update coupon',
        error: err.message,
      });
    } finally {
      if (connection) connection.release();
    }
  }
);

router.delete(
  '/coupons/:id',
  authenticate,
  validate([param('id').custom(isValidId).withMessage('Coupon ID must be a valid positive integer')]),
  async (req, res) => {
    let connection;
    try {
      if (!pool) throw new Error('Database pool not initialized');
      connection = await pool.getConnection();
      const [coupon] = await connection.query('SELECT image FROM coupons WHERE id = ?', [req.sanitizedId]);
      if (!coupon.length) {
        return res.status(404).json({ success: false, message: 'Coupon not found' });
      }

      await destroyCloudinaryImage(coupon[0].image);

      const [result] = await connection.query('DELETE FROM coupons WHERE id = ?', [req.sanitizedId]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Coupon not found' });
      }

      res.json({ success: true, message: 'Coupon deleted successfully' });
    } catch (err) {
      console.error('Coupon Delete Error:', { message: err.message, stack: err.stack });
      res.status(500).json({ success: false, message: 'Failed to delete coupon', error: err.message });
    } finally {
      if (connection) connection.release();
    }
  }
);

// ========== TOP PICKS ==========
router.get('/top-picks', authenticate, async (req, res) => {
  let connection;
  try {
    if (!pool) throw new Error('Database pool not initialized');
    connection = await pool.getConnection();
    const [topPicks] = await connection.query(`
      SELECT t.id AS _id, m.id AS item_id, m.name AS name, m.description, m.category, 
             CAST(m.price AS DECIMAL(10,2)) AS price, 
             CAST(m.saved_amount AS DECIMAL(10,2)) AS savedAmount, 
             m.image
      FROM top_picks t
      JOIN menu m ON t.item_id = m.id
      ORDER BY m.name ASC
    `);
    res.json({
      success: true,
      data: topPicks.map(item => ({
        ...item,
        _id: String(item._id),
        item_id: String(item.item_id),
        price: parseFloat(item.price),
        savedAmount: item.savedAmount ? parseFloat(item.savedAmount) : null,
      })),
    });
  } catch (err) {
    console.error('Top Picks Fetch Error:', { message: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: 'Failed to fetch top picks', error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

router.post(
  '/top-picks',
  authenticate,
  validate([body('itemId').custom(isValidId).withMessage('Item ID must be a valid positive integer')]),
  async (req, res) => {
    let connection;
    try {
      if (!pool) throw new Error('Database pool not initialized');
      connection = await pool.getConnection();
      const { itemId } = req.body;
      const parsedItemId = req.sanitizedId;

      const [items] = await connection.query('SELECT id FROM menu WHERE id = ?', [parsedItemId]);
      if (!items.length) {
        return res.status(404).json({ success: false, message: 'Menu item not found' });
      }

      const [existing] = await connection.query('SELECT id FROM top_picks WHERE item_id = ?', [parsedItemId]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: 'Item is already a top pick' });
      }

      const [result] = await connection.query('INSERT INTO top_picks (item_id) VALUES (?)', [parsedItemId]);
      res.status(201).json({
        success: true,
        data: { _id: String(result.insertId), itemId: String(parsedItemId) },
      });
    } catch (err) {
      console.error('Top Pick Add Error:', { message: err.message, stack: err.stack });
      res.status(400).json({ success: false, message: 'Failed to add top pick', error: err.message });
    } finally {
      if (connection) connection.release();
    }
  }
);

router.delete(
  '/top-picks/:id',
  authenticate,
  validate([param('id').custom(isValidId).withMessage('Top Pick ID must be a valid positive integer')]),
  async (req, res) => {
    let connection;
    try {
      if (!pool) throw new Error('Database pool not initialized');
      connection = await pool.getConnection();
      const [result] = await connection.query('DELETE FROM top_picks WHERE id = ?', [req.sanitizedId]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Top pick not found' });
      }

      res.json({ success: true, message: 'Top pick removed successfully' });
    } catch (err) {
      console.error('Top Pick Delete Error:', { message: err.message, stack: err.stack });
      res.status(500).json({ success: false, message: 'Failed to remove top pick', error: err.message });
    } finally {
      if (connection) connection.release();
    }
  }
);

module.exports = router;