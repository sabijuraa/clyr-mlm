const router = require('express').Router();
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { generateInvoicePDF, generateCommissionStatementPDF } = require('../services/pdf');

// Generate/download invoice for an order
router.get('/order/:orderId', authenticate, async (req, res) => {
  try {
    const order = await db.query('SELECT * FROM orders WHERE id = $1', [req.params.orderId]);
    if (!order.rows[0]) return res.status(404).json({ error: 'Bestellung nicht gefunden' });
    const o = order.rows[0];
    // Only owner or admin
    if (o.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Nicht berechtigt' });

    const items = await db.query('SELECT * FROM order_items WHERE order_id = $1', [req.params.orderId]);
    const invoiceNumber = `RE-${o.order_number}`;
    
    const pdfBuffer = await generateInvoicePDF(o, items.rows, invoiceNumber);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Commission statement for a partner (monthly)
router.get('/commission-statement', authenticate, requireRole('partner', 'admin'), async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0);

    const partner = await db.query(`
      SELECT p.*, u.first_name, u.last_name, u.email, r.name_de as rank_name
      FROM partners p JOIN users u ON p.user_id = u.id JOIN ranks r ON p.rank_id = r.id
      WHERE p.user_id = $1`, [req.user.id]);
    if (!partner.rows[0]) return res.status(404).json({ error: 'Partner nicht gefunden' });

    const commissions = await db.query(`
      SELECT * FROM commission_transactions
      WHERE partner_id = $1 AND created_at >= $2 AND created_at <= $3
      ORDER BY created_at`, [partner.rows[0].id, startDate, endDate]);

    const period = `${String(m).padStart(2, '0')}/${y}`;
    const pdfBuffer = await generateCommissionStatementPDF(partner.rows[0], commissions.rows, period);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Provisionsgutschrift-${period.replace('/', '-')}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
