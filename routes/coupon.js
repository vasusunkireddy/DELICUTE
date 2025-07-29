const express = require('express');
const router = express.Router();

// Get all valid coupons
router.get('/coupons', async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ success: false, message: 'Database connection not found', errorCode: 'DB_ERROR' });
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [coupons] = await db.query(`
      SELECT code, category, buy_x, discount, validFrom, validTo, description, image
      FROM coupons
      WHERE validFrom <= ? AND validTo >= ? AND isActive = true
    `, [now, now]);

    res.json({
      success: true,
      data: coupons.map(coupon => ({
        code: coupon.code,
        category: coupon.category,
        buy_x: parseInt(coupon.buy_x),
        discount: parseInt(coupon.discount),
        validFrom: coupon.validFrom,
        validTo: coupon.validTo,
        description: coupon.description || '',
        image: coupon.image || null
      }))
    });
  } catch (error) {
    console.error('Error fetching coupons:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupons',
      errorCode: 'SERVER_ERROR'
    });
  }
});

// Validate coupon during order submission
router.post('/validate-coupon', async (req, res) => {
  try {
    const { couponCode, items, userId } = req.body;

    if (!couponCode || typeof couponCode !== 'string' || couponCode.trim() === '') {
      return res.status(400).json({ success: false, message: 'Invalid coupon code', errorCode: 'INVALID_COUPON_CODE' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid items list', errorCode: 'INVALID_ITEMS' });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ success: false, message: 'User ID required', errorCode: 'MISSING_USER_ID' });
    }

    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ success: false, message: 'Database connection not found', errorCode: 'DB_ERROR' });
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [coupons] = await db.query(`
      SELECT code, category, buy_x, discount
      FROM coupons
      WHERE code = ? AND validFrom <= ? AND validTo >= ? AND isActive = true
    `, [couponCode.trim(), now, now]);

    if (coupons.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired coupon', errorCode: 'COUPON_NOT_FOUND' });
    }

    const coupon = coupons[0];

    const eligibleItems = await Promise.all(
      items.map(async (item) => {
        if (!item._id || !Number.isInteger(item.quantity) || item.quantity < 1) {
          return false;
        }
        const [result] = await db.query('SELECT category FROM menu WHERE id = ?', [item._id]);
        return result.length > 0 && result[0].category.toLowerCase() === coupon.category.toLowerCase();
      })
    );

    const eligibleQuantity = eligibleItems.reduce((sum, valid, index) => {
      return valid ? sum + items[index].quantity : sum;
    }, 0);

    if (eligibleQuantity < coupon.buy_x) {
      return res.status(400).json({
        success: false,
        message: `Coupon requires at least ${coupon.buy_x} items from ${coupon.category}`,
        errorCode: 'INSUFFICIENT_QUANTITY'
      });
    }

    res.json({
      success: true,
      data: {
        code: coupon.code,
        category: coupon.category,
        buy_x: parseInt(coupon.buy_x),
        discount: parseInt(coupon.discount)
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to validate coupon',
      errorCode: 'SERVER_ERROR'
    });
  }
});

// Remove applied coupon
router.post('/remove-coupon', async (req, res) => {
  try {
    const { couponCode, userId } = req.body;

    if (!couponCode || typeof couponCode !== 'string' || couponCode.trim() === '') {
      return res.status(400).json({ success: false, message: 'Invalid coupon code', errorCode: 'INVALID_COUPON_CODE' });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ success: false, message: 'User ID required', errorCode: 'MISSING_USER_ID' });
    }

    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ success: false, message: 'Database connection not found', errorCode: 'DB_ERROR' });
    }

    res.json({
      success: true,
      message: 'Coupon removed successfully'
    });
  } catch (error) {
    console.error('Error removing coupon:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to remove coupon',
      errorCode: 'SERVER_ERROR'
    });
  }
});

module.exports = router;