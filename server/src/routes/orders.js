const router = require('express').Router();
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendOrderConfirmation } = require('../services/email');

function generateOrderNumber() {
  const date = new Date();
  const prefix = 'CLYR';
  const ts = date.getFullYear().toString().slice(-2) + String(date.getMonth()+1).padStart(2,'0');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

function getShippingCost(country, subtotal) {
  const thresholds = { AT: 69, DE: 50, CH: 180 };
  const costs = { AT: 5.90, DE: 6.90, CH: 15.00 };
  const threshold = thresholds[country] || 69;
  return subtotal >= threshold ? 0 : (costs[country] || 6.90);
}

function getTaxRate(country) {
  const rates = { AT: 0.20, DE: 0.19, CH: 0.081 };
  return rates[country] || 0.20;
}

// Create order
router.post('/', authenticate, async (req, res) => {
  try {
    const { items, shippingAddress, billingAddress, referralCode, paymentMethod } = req.body;
    if (!items?.length || !shippingAddress) {
      return res.status(400).json({ error: 'Bestelldaten unvollständig' });
    }

    const country = shippingAddress.country || 'AT';
    const priceField = country === 'DE' ? 'price_de' : country === 'CH' ? 'price_ch' : 'price_at';

    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      let product, price, productName, productSku;
      if (item.variantId) {
        const vResult = await db.query(
          `SELECT pv.*, p.name as product_name FROM product_variants pv JOIN products p ON pv.product_id = p.id WHERE pv.id = $1`, [item.variantId]
        );
        if (!vResult.rows[0]) return res.status(400).json({ error: `Variante nicht gefunden: ${item.variantId}` });
        const v = vResult.rows[0];
        price = parseFloat(v[priceField] || v.price_at);
        productName = `${v.product_name} - ${v.name}`;
        productSku = v.sku;
      } else {
        const pResult = await db.query('SELECT * FROM products WHERE id = $1 AND is_active = true', [item.productId]);
        if (!pResult.rows[0]) return res.status(400).json({ error: `Produkt nicht gefunden: ${item.productId}` });
        product = pResult.rows[0];
        price = parseFloat(product[priceField] || product.price_at);
        productName = product.name;
        productSku = product.sku;
      }
      const qty = item.quantity || 1;
      subtotal += price * qty;
      orderItems.push({ productId: item.productId, variantId: item.variantId, quantity: qty, unitPrice: price, totalPrice: price * qty, productName, productSku });
    }

    const shipping = getShippingCost(country, subtotal);
    const taxRate = getTaxRate(country);
    const taxAmount = (subtotal + shipping) * taxRate / (1 + taxRate); // Tax is included in price
    const total = subtotal + shipping;
    const orderNumber = generateOrderNumber();

    // Find partner from referral code
    let partnerId = null;
    if (referralCode) {
      const pResult = await db.query('SELECT id FROM partners WHERE referral_code = $1', [referralCode.toUpperCase()]);
      if (pResult.rows[0]) partnerId = pResult.rows[0].id;
    }

    const orderResult = await db.query(`
      INSERT INTO orders (order_number, user_id, partner_id, referral_code, status, payment_method, subtotal, shipping_cost, tax_amount, tax_rate, total, currency, shipping_country, shipping_address, billing_address)
      VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,$8,$9,$10,'EUR',$11,$12,$13) RETURNING *`,
      [orderNumber, req.user.id, partnerId, referralCode?.toUpperCase(), paymentMethod || 'stripe',
       subtotal, shipping, taxAmount, taxRate * 100, total, country,
       JSON.stringify(shippingAddress), JSON.stringify(billingAddress || shippingAddress)]
    );
    const order = orderResult.rows[0];

    for (const item of orderItems) {
      await db.query(
        'INSERT INTO order_items (order_id, product_id, variant_id, quantity, unit_price, total_price, product_name, product_sku) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [order.id, item.productId, item.variantId, item.quantity, item.unitPrice, item.totalPrice, item.productName, item.productSku]
      );
    }

    res.status(201).json(order);

    // Send order confirmation email (non-blocking)
    sendOrderConfirmation(order, orderItems, req.user.email).catch(e => console.error('Order email failed:', e.message));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's orders
router.get('/my', authenticate, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT o.*, (SELECT json_agg(json_build_object('id', oi.id, 'product_name', oi.product_name, 'quantity', oi.quantity, 'unit_price', oi.unit_price, 'total_price', oi.total_price))
       FROM order_items oi WHERE oi.order_id = o.id) as items
      FROM orders o WHERE o.user_id = $1 ORDER BY o.created_at DESC`, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get order by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT o.*, (SELECT json_agg(json_build_object('id', oi.id, 'product_name', oi.product_name, 'product_sku', oi.product_sku, 'quantity', oi.quantity, 'unit_price', oi.unit_price, 'total_price', oi.total_price))
       FROM order_items oi WHERE oi.order_id = o.id) as items
      FROM orders o WHERE o.id = $1`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Bestellung nicht gefunden' });
    if (req.user.role !== 'admin' && result.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update order status (admin)
router.put('/:id/status', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    let query = 'UPDATE orders SET updated_at = NOW()';
    const params = [];
    if (status) { params.push(status); query += `, status = $${params.length}`; }
    if (paymentStatus) { params.push(paymentStatus); query += `, payment_status = $${params.length}`; }
    if (status === 'shipped') query += ', shipped_at = NOW()';
    if (status === 'delivered') query += ', delivered_at = NOW()';
    params.push(req.params.id);
    query += ` WHERE id = $${params.length} RETURNING *`;
    const result = await db.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all orders (admin)
router.get('/admin/all', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let query = `
      SELECT o.*, u.first_name, u.last_name, u.email,
        (SELECT json_agg(json_build_object('product_name', oi.product_name, 'quantity', oi.quantity, 'total_price', oi.total_price))
         FROM order_items oi WHERE oi.order_id = o.id) as items
      FROM orders o JOIN users u ON o.user_id = u.id`;
    const params = [];
    if (status) { params.push(status); query += ` WHERE o.status = $${params.length}`; }
    query += ' ORDER BY o.created_at DESC';
    params.push(parseInt(limit)); query += ` LIMIT $${params.length}`;
    params.push((parseInt(page) - 1) * parseInt(limit)); query += ` OFFSET $${params.length}`;
    
    const result = await db.query(query, params);
    const countResult = await db.query('SELECT COUNT(*) FROM orders');
    res.json({ orders: result.rows, total: parseInt(countResult.rows[0].count), totalPages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
