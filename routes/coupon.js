const express = require('express');
const router = express.Router();

// Get all valid coupons
router.get('/coupons', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    if (!db) throw new Error('Database connection not found');

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
        buy_x: coupon.buy_x,
        discount: coupon.discount,
        validFrom: coupon.validFrom,
        validTo: coupon.validTo,
        description: coupon.description,
        image: coupon.image || null // Use the Cloudinary URL directly
      }))
    });
  } catch (error) {
    console.error('Error fetching coupons:', { message: error.message, stack: error.stack });
    next(error);
  }
});

// Validate coupon during order submission
router.post('/validate-coupon', async (req, res, next) => {
  try {
    const { couponCode, items } = req.body;
    if (!couponCode || typeof couponCode !== 'string' || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid coupon code or items' });
    }

    const db = req.app.locals.db;
    if (!db) throw new Error('Database connection not found');

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    const [coupons] = await db.query(`
      SELECT code, category, buy_x, discount
      FROM coupons
      WHERE code = ? AND validFrom <= ? AND validTo >= ? AND isActive = true
    `, [couponCode, now, now]);

    if (coupons.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired coupon' });
    }

    const coupon = coupons[0];
    const eligibleItems = await Promise.all(
      items.map(async (item) => {
        if (!item._id || !item.quantity || typeof item.quantity !== 'number') return false;
        const [result] = await db.query('SELECT category FROM menu WHERE id = ?', [item._id]);
        return result.length > 0 && result[0].category === coupon.category;
      })
    );

    const eligibleQuantity = eligibleItems.reduce((sum, valid, index) => {
      return valid ? sum + items[index].quantity : sum;
    }, 0);

    if (eligibleQuantity < coupon.buy_x) {
      return res.status(400).json({ success: false, message: `Coupon requires at least ${coupon.buy_x} items from ${coupon.category}` });
    }

    res.json({
      success: true,
      data: {
        code: coupon.code,
        discount: coupon.discount,
        category: coupon.category,
        buy_x: coupon.buy_x
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', { message: error.message, stack: error.stack });
    next(error);
  }
});

module.exports = router;