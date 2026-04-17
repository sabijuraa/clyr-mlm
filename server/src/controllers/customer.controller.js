// server/src/controllers/customer.controller.js
// GROUP 7: Customer Portal
// #9: Fix customer auth flow
// #42: Document upload for customers (installation guides)
// #36: Filter subscription system
import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';

// ========================================
// #9: AUTHENTICATION (FIXED)
// ========================================

export const customerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });
    }

    const result = await pool.query(
      'SELECT * FROM customers WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Ungueltige Anmeldedaten' });
    }

    const customer = result.rows[0];

    if (!customer.password_hash) {
      // Customer exists but has no password - set one via registration
      return res.status(401).json({ 
        error: 'Für dieses Konto wurde noch kein Passwort gesetzt. Bitte nutzen Sie die Registrierung, um ein Passwort festzulegen.',
        needsRegistration: true,
        email: customer.email
      });
    }

    const isValidPassword = await bcrypt.compare(password, customer.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Ungueltige Anmeldedaten' });
    }

    // Token with consistent fields
    const token = jwt.sign(
      { id: customer.id, customerId: customer.id, email: customer.email, role: 'customer', type: 'customer' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    delete customer.password_hash;
    res.json({ token, customer });
  } catch (error) {
    console.error('Customer login error:', error);
    res.status(500).json({ error: 'Anmeldung fehlgeschlagen' });
  }
};

export const loginCustomer = customerLogin;

export const customerRegister = async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone, street, zip, city, country } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });
    }

    // Check if customer exists without password (created during checkout)
    const existing = await pool.query('SELECT id, password_hash FROM customers WHERE email = $1', [email.toLowerCase()]);
    
    const password_hash = await bcrypt.hash(password, 10);

    let customer;
    if (existing.rows.length > 0) {
      if (existing.rows[0].password_hash) {
        return res.status(409).json({ error: 'E-Mail bereits registriert. Bitte melden Sie sich an.' });
      }
      // Update existing customer with password
      const result = await pool.query(`
        UPDATE customers SET 
          password_hash = $1, is_registered = true,
          first_name = COALESCE($2, first_name), last_name = COALESCE($3, last_name),
          phone = COALESCE($4, phone), street = COALESCE($5, street),
          zip = COALESCE($6, zip), city = COALESCE($7, city), country = COALESCE($8, country)
        WHERE id = $9
        RETURNING id, first_name, last_name, email, phone, street, zip, city, country, created_at
      `, [password_hash, first_name, last_name, phone, street, zip, city, country || 'AT', existing.rows[0].id]);
      customer = result.rows[0];
    } else {
      const result = await pool.query(`
        INSERT INTO customers (first_name, last_name, email, password_hash, phone, street, zip, city, country, is_registered)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        RETURNING id, first_name, last_name, email, phone, street, zip, city, country, created_at
      `, [first_name || '', last_name || '', email.toLowerCase(), password_hash, phone, street, zip, city, country || 'AT']);
      customer = result.rows[0];
    }

    const token = jwt.sign(
      { id: customer.id, customerId: customer.id, email: customer.email, role: 'customer', type: 'customer' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, customer });
  } catch (error) {
    console.error('Customer registration error:', error);
    res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
  }
};

export const registerCustomer = customerRegister;

// ========================================
// FORGOT / RESET PASSWORD (also works for existing unregistered customers)
// ========================================

/**
 * Request password reset link via email
 * Works for both registered customers AND customers who placed orders without setting a password
 */
export const customerForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'E-Mail erforderlich' });
    }

    const result = await pool.query(
      'SELECT id, email, first_name FROM customers WHERE email = $1',
      [email.toLowerCase()]
    );

    // Always return success to prevent email enumeration
    if (result.rows.length === 0) {
      return res.json({ message: 'Wenn die E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet' });
    }

    const customer = result.rows[0];

    // Generate random token
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Ensure columns exist
    try {
      await pool.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255)');
      await pool.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP');
    } catch(e) {}

    await pool.query(
      'UPDATE customers SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [hashedToken, expiresAt, customer.id]
    );

    // Send email
    try {
      const { sendEmail } = await import('../services/email.service.js');
      const resetUrl = `${process.env.FRONTEND_URL || 'https://clyr.shop'}/customer/reset-password?token=${resetToken}`;
      
      await sendEmail({
        to: customer.email,
        subject: 'Passwort setzen - CLYR Kundenbereich',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0ea5e9;">CLYR Kundenbereich</h2>
            <p>Hallo ${customer.first_name || ''},</p>
            <p>Sie haben eine Anfrage zum Setzen / Zurücksetzen Ihres Passworts gestellt.</p>
            <p>Klicken Sie auf den Button unten, um ein neues Passwort festzulegen:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Passwort festlegen
              </a>
            </p>
            <p style="color: #666; font-size: 12px;">
              Oder kopieren Sie diesen Link: ${resetUrl}
            </p>
            <p style="color: #666; font-size: 12px;">
              Dieser Link ist 24 Stunden gültig. Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.
            </p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #999; font-size: 11px; text-align: center;">
              CLYR Solutions GmbH | Pappelweg 4b, 9524 Villach, Österreich<br>
              service@clyr.shop | www.clyr.shop
            </p>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('Failed to send customer password reset email:', emailErr);
    }

    res.json({ message: 'Wenn die E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet' });
  } catch (error) {
    console.error('Customer forgot password error:', error);
    res.status(500).json({ error: 'Anfrage fehlgeschlagen' });
  }
};

/**
 * Reset customer password using token
 */
export const customerResetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token und neues Passwort erforderlich' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' });
    }

    const crypto = await import('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const result = await pool.query(
      `SELECT id, email, first_name, last_name FROM customers 
       WHERE password_reset_token = $1 AND password_reset_expires > CURRENT_TIMESTAMP`,
      [hashedToken]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Token ungültig oder abgelaufen' });
    }

    const customer = result.rows[0];
    const password_hash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE customers SET 
        password_hash = $1, 
        password_reset_token = NULL, 
        password_reset_expires = NULL,
        is_registered = true
       WHERE id = $2`,
      [password_hash, customer.id]
    );

    // Auto-login - return a fresh JWT
    const jwtToken = jwt.sign(
      { id: customer.id, customerId: customer.id, email: customer.email, role: 'customer', type: 'customer' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({ 
      message: 'Passwort erfolgreich gesetzt',
      token: jwtToken,
      customer
    });
  } catch (error) {
    console.error('Customer reset password error:', error);
    res.status(500).json({ error: 'Passwort-Reset fehlgeschlagen' });
  }
};

// ========================================
// PROFILE
// ========================================

export const getCustomerProfile = async (req, res) => {
  try {
    const customerId = req.customer?.id || req.user?.id;
    const result = await pool.query(`
      SELECT id, first_name, last_name, email, phone, street, zip, city, country, created_at
      FROM customers WHERE id = $1
    `, [customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kunde nicht gefunden' });
    }
    res.json({ customer: result.rows[0] });
  } catch (error) {
    console.error('Get customer profile error:', error);
    res.status(500).json({ error: 'Profil konnte nicht geladen werden' });
  }
};

export const getCurrentCustomer = getCustomerProfile;

export const updateCustomerProfile = async (req, res) => {
  try {
    const customerId = req.customer?.id || req.user?.id;
    const { first_name, last_name, phone, street, zip, city, country } = req.body;

    const result = await pool.query(`
      UPDATE customers SET
        first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name),
        phone = COALESCE($3, phone), street = COALESCE($4, street),
        zip = COALESCE($5, zip), city = COALESCE($6, city),
        country = COALESCE($7, country), updated_at = NOW()
      WHERE id = $8
      RETURNING id, first_name, last_name, email, phone, street, zip, city, country
    `, [first_name, last_name, phone, street, zip, city, country, customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kunde nicht gefunden' });
    }
    res.json({ customer: result.rows[0] });
  } catch (error) {
    console.error('Update customer profile error:', error);
    res.status(500).json({ error: 'Profil konnte nicht aktualisiert werden' });
  }
};

// ========================================
// ORDERS
// ========================================

export const getCustomerOrders = async (req, res) => {
  try {
    const customerId = req.customer?.id || req.user?.id;
    const orders = await pool.query(`
      SELECT o.id, o.order_number, o.status, o.payment_status,
             o.subtotal, o.shipping_cost, o.vat_amount, o.total, o.created_at,
             o.invoice_number
      FROM orders o
      WHERE o.customer_id = $1
         OR (o.customer_email = (SELECT email FROM customers WHERE id = $1) AND o.customer_id IS NULL)
      ORDER BY o.created_at DESC
    `, [customerId]);

    // Get items for each order
    for (const order of orders.rows) {
      const items = await pool.query(`
        SELECT oi.quantity, oi.product_price as price,
               COALESCE(p.name, oi.product_name) as name, oi.total
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
      `, [order.id]);
      order.items = items.rows;
    }

    res.json({ orders: orders.rows });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ error: 'Bestellungen konnten nicht geladen werden' });
  }
};

// ========================================
// INVOICES
// ========================================

export const getCustomerInvoices = async (req, res) => {
  try {
    const customerId = req.customer?.id || req.user?.id;
    const result = await pool.query(`
      SELECT i.* FROM invoices i WHERE i.customer_id = $1 ORDER BY i.created_at DESC
    `, [customerId]);
    res.json({ invoices: result.rows });
  } catch (error) {
    console.error('Get customer invoices error:', error);
    res.status(500).json({ error: 'Rechnungen konnten nicht geladen werden' });
  }
};

// ========================================
// #42: DOCUMENT UPLOAD (Installation guides)
// ========================================

export const getCustomerDocuments = async (req, res) => {
  try {
    const customerId = req.customer?.id || req.user?.id;

    const result = await pool.query(`
      SELECT cd.*, p.name as product_name
      FROM customer_documents cd
      LEFT JOIN products p ON cd.product_id = p.id
      WHERE cd.customer_id = $1
      ORDER BY cd.created_at DESC
    `, [customerId]);

    res.json({ documents: result.rows });
  } catch (error) {
    console.error('Get customer documents error:', error);
    res.status(500).json({ error: 'Dokumente konnten nicht geladen werden' });
  }
};

export const getDocumentsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Get public documents for this product (installation guides, manuals)
    const result = await pool.query(`
      SELECT cd.id, cd.title, cd.description, cd.document_type, cd.file_url, cd.created_at
      FROM customer_documents cd
      WHERE cd.product_id = $1 AND cd.is_public = true
      ORDER BY cd.sort_order, cd.created_at
    `, [productId]);

    res.json({ documents: result.rows });
  } catch (error) {
    console.error('Get product documents error:', error);
    res.status(500).json({ error: 'Dokumente konnten nicht geladen werden' });
  }
};

// Admin: Upload document for a customer/product
export const uploadCustomerDocument = async (req, res) => {
  try {
    const { customerId, productId, title, description, documentType, isPublic } = req.body;
    const file = req.file;

    if (!file && !req.body.fileUrl) {
      return res.status(400).json({ error: 'Datei erforderlich' });
    }

    const fileUrl = file 
      ? `/uploads/documents/${file.filename}` 
      : req.body.fileUrl;

    const result = await pool.query(`
      INSERT INTO customer_documents (customer_id, product_id, title, description, document_type, file_url, is_public)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      customerId || null, 
      productId || null, 
      title || file?.originalname || 'Dokument', 
      description || '', 
      documentType || 'installation_guide',
      fileUrl,
      isPublic === 'true' || isPublic === true
    ]);

    res.status(201).json({ document: result.rows[0] });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Upload fehlgeschlagen' });
  }
};

// ========================================
// #36: FILTER SUBSCRIPTION SYSTEM
// ========================================

export const getCustomerSubscriptions = async (req, res) => {
  try {
    const customerId = req.customer?.id || req.user?.id;

    const result = await pool.query(`
      SELECT s.*, p.name as product_name, p.price as product_price,
             p.image_url as product_image
      FROM subscriptions s
      JOIN products p ON s.product_id = p.id
      WHERE s.customer_id = $1
      ORDER BY s.created_at DESC
    `, [customerId]);

    res.json({ subscriptions: result.rows });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ error: 'Abonnements konnten nicht geladen werden' });
  }
};

export const createFilterSubscription = async (req, res) => {
  try {
    const customerId = req.customer?.id || req.user?.id;
    const { productId, intervalMonths } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Produkt-ID erforderlich' });
    }

    // Check product exists and is subscription eligible
    const productResult = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND is_active = true',
      [productId]
    );
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Produkt nicht gefunden' });
    }

    const product = productResult.rows[0];
    const interval = intervalMonths || product.subscription_interval_months || 12;

    // Check for existing active subscription
    const existing = await pool.query(
      `SELECT id FROM subscriptions WHERE customer_id = $1 AND product_id = $2 AND status = 'active'`,
      [customerId, productId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Sie haben bereits ein aktives Abonnement fuer dieses Produkt' });
    }

    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + interval);

    const result = await pool.query(`
      INSERT INTO subscriptions (customer_id, product_id, status, interval_months, price, next_billing_at)
      VALUES ($1, $2, 'active', $3, $4, $5)
      RETURNING *
    `, [customerId, productId, interval, product.price, nextBilling]);

    res.status(201).json({
      message: `Filter-Abonnement aktiviert. Naechste Lieferung: ${nextBilling.toLocaleDateString('de-DE')}`,
      subscription: result.rows[0]
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Abonnement konnte nicht erstellt werden' });
  }
};

export const cancelCustomerSubscription = async (req, res) => {
  try {
    const customerId = req.customer?.id || req.user?.id;
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(`
      UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = $1
      WHERE id = $2 AND customer_id = $3 AND status = 'active'
      RETURNING *
    `, [reason || 'Vom Kunden gekuendigt', id, customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Abonnement nicht gefunden oder bereits gekuendigt' });
    }

    // Notify customer + admin (best effort)
    try {
      const details = await pool.query(
        `SELECT c.email, c.first_name, c.last_name, p.name as product_name
         FROM subscriptions s
         JOIN customers c ON s.customer_id = c.id
         LEFT JOIN products p ON s.product_id = p.id
         WHERE s.id = $1`,
        [id]
      );
      const row = details.rows[0];
      if (row?.email) {
        const { sendEmail } = await import('../services/email.service.js');
        await sendEmail({
          to: row.email,
          subject: 'Ihre Abo-Kuendigung wurde bestaetigt',
          html: `
            <h2>Kuendigung bestaetigt</h2>
            <p>Hallo ${row.first_name || ''},</p>
            <p>Ihr Abonnement${row.product_name ? ` fuer <strong>${row.product_name}</strong>` : ''} wurde gekuendigt.</p>
            <p>${reason ? `Grund: ${reason}` : ''}</p>
          `
        }).catch((e) => console.error('Customer cancellation email failed:', e.message));

        const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM || 'service@clyr.shop';
        await sendEmail({
          to: adminEmail,
          subject: `Abo gekuendigt: ${row.first_name || ''} ${row.last_name || ''}`.trim(),
          html: `
            <h2>Abo-Kuendigung</h2>
            <p><strong>Kunde:</strong> ${row.first_name || ''} ${row.last_name || ''}</p>
            <p><strong>E-Mail:</strong> ${row.email}</p>
            <p><strong>Produkt:</strong> ${row.product_name || '-'}</p>
            <p>${reason ? `<strong>Grund:</strong> ${reason}` : ''}</p>
          `
        }).catch((e) => console.error('Customer cancellation admin email failed:', e.message));
      }
    } catch (mailErr) {
      console.error('Cancel customer subscription notification error:', mailErr.message);
    }

    res.json({ message: 'Abonnement gekuendigt', subscription: result.rows[0] });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Kuendigung fehlgeschlagen' });
  }
};

// Download invoice for an order
export const downloadOrderInvoice = async (req, res) => {
  try {
    const customerId = req.customer?.id || req.user?.id;
    const { orderNumber } = req.params;

    const order = await pool.query(
      'SELECT id, invoice_number FROM orders WHERE order_number = $1 AND customer_id = $2',
      [orderNumber, customerId]
    );

    if (order.rows.length === 0) {
      return res.status(404).json({ error: 'Bestellung nicht gefunden' });
    }

    const invoiceNum = order.rows[0].invoice_number;
    if (!invoiceNum) {
      return res.status(404).json({ error: 'Rechnung noch nicht erstellt' });
    }

    // Try to find existing PDF
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const pdfPath = path.join(__dirname, '..', 'public', 'invoices', `${invoiceNum}.pdf`);
    
    if (fs.existsSync(pdfPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Rechnung-${invoiceNum}.pdf"`);
      return fs.createReadStream(pdfPath).pipe(res);
    }

    // Generate on the fly
    try {
      const { generateInvoice } = await import('../services/invoice.service.js');
      await generateInvoice(order.rows[0].id);
      if (fs.existsSync(pdfPath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Rechnung-${invoiceNum}.pdf"`);
        return fs.createReadStream(pdfPath).pipe(res);
      }
    } catch (e) { /* */ }

    res.status(404).json({ error: 'Rechnung konnte nicht generiert werden' });
  } catch (error) {
    console.error('Download invoice error:', error);
    res.status(500).json({ error: 'Download fehlgeschlagen' });
  }
};
