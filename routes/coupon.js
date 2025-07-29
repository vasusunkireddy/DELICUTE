const express = require('express');
const router = express.Router();
const fs = require('fs'); // Ensure this is at the top of server.js or route-loading file

// Get all valid coupons
router.get('/coupons', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
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
        image: coupon.image ? `${req.protocol}://${req.get('host')}/Uploads/${coupon.image}` : null
      }))
    });
  } catch (error) {
    console.error('Error fetching coupons:', error.message);
    next(error); // Pass to error handling middleware
  }
});

// Validate coupon during order submission
router.post('/validate-coupon', async (req, res, next) => {
  try {
    const { couponCode, items } = req.body;
    if (!couponCode || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Invalid coupon code or items' });
    }

    const db = req.app.locals.db;
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
    const eligibleItems = items.filter(item => {
      // Fetch item category from database to ensure accuracy
      return db.query('SELECT category FROM menu WHERE id = ?', [item._id])
        .then(([result]) => result.length > 0 && result[0].category === coupon.category)
        .catch(() => false);
    });

    const eligibleQuantity = (await Promise.all(eligibleItems)).reduce((sum, valid, index) => {
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
    console.error('Error validating coupon:', error.message);
    next(error);
  }
});

module.exports = router;