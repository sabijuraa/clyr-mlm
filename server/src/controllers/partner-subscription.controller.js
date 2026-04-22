// server/src/controllers/partner-subscription.controller.js
// GROUP 5: #37 Affiliate subscription, #54 Prospect protection, #53 Crossline prohibition
import Stripe from 'stripe';
import { query, transaction } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import { getPublicApiUrl, getPublicAppUrl } from '../utils/public-url.js';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Helper: annual affiliate fee is prorated to the remaining days of the current year
const AFFILIATE_ANNUAL_FEE = 100.00;

const getAffiliateFeePeriod = (startDate = new Date()) => {
  const now = new Date(startDate);
  const year = now.getFullYear();

  const startOfDay = new Date(Date.UTC(year, now.getMonth(), now.getDate()));
  const startOfNextYear = new Date(Date.UTC(year + 1, 0, 1));
  const startOfYear = new Date(Date.UTC(year, 0, 1));

  const daysRemaining = Math.max(1, Math.round((startOfNextYear - startOfDay) / 86400000));
  const daysInYear = Math.max(365, Math.round((startOfNextYear - startOfYear) / 86400000));
  const amount = Math.round((AFFILIATE_ANNUAL_FEE * daysRemaining / daysInYear) * 100) / 100;
  const periodStart = new Date(startDate);
  const periodEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  return {
    periodStart,
    periodEnd,
    amount
  };
};

const notifyNewDownlineActivation = async (partnerId) => {
  try {
    const partnerResult = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.upline_id,
              up.email as upline_email, up.first_name as upline_first_name, up.last_name as upline_last_name
       FROM users u
       LEFT JOIN users up ON up.id = u.upline_id
       WHERE u.id = $1`,
      [partnerId]
    );
    const partner = partnerResult.rows[0];
    if (!partner) return;

    const { sendEmail } = await import('../services/email.service.js');
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM || 'service@clyr.shop';

    if (partner.upline_email) {
      await sendEmail({
        to: partner.upline_email,
        subject: `Neuer aktiver Partner in Ihrem Team: ${partner.first_name} ${partner.last_name}`,
        html: `
          <h2>Neuer aktiver Partner in Ihrer Downline</h2>
          <p>Hallo ${partner.upline_first_name || ''},</p>
          <p><strong>${partner.first_name} ${partner.last_name}</strong> (${partner.email}) ist jetzt als Partner aktiv.</p>
        `
      }).catch((e) => console.error('Downline activation email to upline failed:', e.message));
    }

    await sendEmail({
      to: adminEmail,
      subject: `Neuer aktiver Affiliate: ${partner.first_name} ${partner.last_name}`,
      html: `
        <h2>Partner aktiviert</h2>
        <p><strong>Name:</strong> ${partner.first_name} ${partner.last_name}</p>
        <p><strong>E-Mail:</strong> ${partner.email}</p>
        <p><strong>Upline:</strong> ${partner.upline_first_name || '-'} ${partner.upline_last_name || ''} ${partner.upline_email ? `(${partner.upline_email})` : ''}</p>
      `
    }).catch((e) => console.error('Downline activation email to admin failed:', e.message));
  } catch (err) {
    console.error('notifyNewDownlineActivation error:', err.message);
  }
};

// ==========================================
// STRIPE CHECKOUT FOR PARTNER FEE
// ==========================================

/**
 * Create Stripe Checkout Session for partner annual fee
 * Called right after registration - no auth required, uses partnerId from body
 */
export const createPartnerFeeCheckout = asyncHandler(async (req, res) => {
  const { partnerId, partnerEmail } = req.body;

  if (!partnerId && !partnerEmail) {
    throw new AppError('Partner-ID oder E-Mail erforderlich', 400);
  }

  if (!stripe) {
    throw new AppError('Stripe ist nicht konfiguriert', 500);
  }

  // Find the partner
  const partnerResult = await query(
    'SELECT id, email, first_name, last_name, status FROM users WHERE ' + (partnerId ? 'id = $1' : 'email = $1'),
    [partnerId || partnerEmail]
  );

  if (partnerResult.rows.length === 0) {
    throw new AppError('Partner nicht gefunden', 404);
  }

  const partner = partnerResult.rows[0];
  const { amount: annualFee } = getAffiliateFeePeriod();

  try {
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card', 'klarna', 'eps'],
        mode: 'payment',
        customer_email: partner.email,
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'CLYR Vertriebspartner Jahresgebühr',
              description: 'Intranet-Gebühr anteilig bis Jahresende',
            },
            unit_amount: Math.round(annualFee * 100),
          },
          quantity: 1,
        }],
        metadata: {
          type: 'partner_fee',
          partnerId: String(partner.id),
          partnerEmail: partner.email,
        },
        success_url: `${baseUrl}/api/partners/fee-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/api/partners/fee-cancelled?partnerId=${encodeURIComponent(partner.id)}`,
      });
    } catch (pmError) {
      console.log('Extended payment methods failed for partner fee, falling back to card-only:', pmError.message);
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: partner.email,
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'CLYR Vertriebspartner Jahresgebühr',
              description: 'Intranet-Gebühr anteilig bis Jahresende',
            },
            unit_amount: Math.round(annualFee * 100),
          },
          quantity: 1,
        }],
        metadata: {
          type: 'partner_fee',
          partnerId: String(partner.id),
          partnerEmail: partner.email,
        },
        success_url: `${baseUrl}/api/partners/fee-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/api/partners/fee-cancelled?partnerId=${encodeURIComponent(partner.id)}`,
      });
    }

    res.json({
      url: session.url,
      sessionId: session.id,
      amount: annualFee,
    });
  } catch (err) {
    console.error('Stripe partner fee checkout failed:', err.message);
    throw new AppError('Zahlungsservice nicht verfügbar: ' + err.message, 500);
  }
});

/**
 * Handle Stripe cancel redirect for partner fee
 * Sends cancellation notification and redirects back to login
 */
export const partnerFeeCancelled = async (req, res) => {
  const { partnerId } = req.query;
  const baseUrl = getPublicAppUrl();

  if (!partnerId) {
    return res.redirect(`${baseUrl}/login?fee=cancelled`);
  }

  try {
    const partnerResult = await query(
      'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
      [partnerId]
    );

    if (partnerResult.rows.length > 0) {
      const partner = partnerResult.rows[0];

      try {
        const { sendEmail } = await import('../services/email.service.js');
        const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM || 'service@clyr.shop';

        await sendEmail({
          to: partner.email,
          subject: 'Zahlung der Jahresgebühr abgebrochen - CLYR',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1e293b;">Zahlung abgebrochen</h2>
              <p>Hallo ${partner.first_name || ''},</p>
              <p>Ihre Zahlung der CLYR Vertriebspartner-Jahresgebühr wurde abgebrochen.</p>
              <p>Ihr Partnerkonto bleibt inaktiv, bis die Zahlung erfolgreich abgeschlossen wurde.</p>
              <p>
                Sie können sich erneut anmelden und den Zahlungsvorgang noch einmal starten.
              </p>
              <p style="margin-top: 24px;">Ihr CLYR Team</p>
            </div>
          `
        }).catch((e) => console.error(`Partner cancellation email failed for ${partner.email}:`, e.message));

        await sendEmail({
          to: adminEmail,
          subject: `Partner-Zahlung abgebrochen: ${partner.first_name} ${partner.last_name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1e293b;">Partnerzahlung abgebrochen</h2>
              <p><strong>Name:</strong> ${partner.first_name} ${partner.last_name}</p>
              <p><strong>E-Mail:</strong> ${partner.email}</p>
              <p><strong>Ereignis:</strong> Checkout der Vertriebspartner-Jahresgebühr wurde abgebrochen</p>
            </div>
          `
        }).catch((e) => console.error(`Admin cancellation email failed for ${partner.email}:`, e.message));
      } catch (emailErr) {
        console.error('Failed to send partner fee cancellation notifications:', emailErr.message);
      }

      try {
        await query(
          `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
           VALUES ($1, $2, $3, $4, $5)`,
          [partner.id, 'partner_fee_cancelled', 'user', partner.id, JSON.stringify({ source: 'stripe_checkout_cancel' })]
        );
      } catch (logErr) {
        console.error('Failed to log partner fee cancellation:', logErr.message);
      }
    }
  } catch (err) {
    console.error('Partner fee cancellation handler error:', err.message || err);
  }

  return res.redirect(`${baseUrl}/login?fee=cancelled`);
};

/**
 * Handle Stripe success redirect for partner fee
 * Activates the partner account
 * NOTE: Not using asyncHandler - we handle ALL errors with redirects, never JSON
 */
export const partnerFeeSuccess = async (req, res) => {
  const { session_id } = req.query;
  const baseUrl = getPublicAppUrl();

  if (!session_id) {
    return res.redirect(`${baseUrl}/login?fee=missing`);
  }

  try {
    if (!stripe) {
      console.error('Fee success: Stripe not configured');
      return res.redirect(`${baseUrl}/login?fee=error&reason=stripe_not_configured`);
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log('Fee success: session retrieved, payment_status:', session.payment_status, 'partnerId:', session.metadata?.partnerId);

    if (session.payment_status !== 'paid') {
      return res.redirect(`${baseUrl}/login?fee=unpaid`);
    }

    const partnerId = session.metadata?.partnerId;
    if (!partnerId) {
      console.error('Fee success: No partnerId in session metadata');
      return res.redirect(`${baseUrl}/login?fee=error&reason=no_partner`);
    }

    const { periodStart, periodEnd, amount } = getAffiliateFeePeriod(new Date());

    // Ensure tables and columns exist
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS subscription_payments (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES users(id),
          amount DECIMAL(10,2) NOT NULL,
          payment_method VARCHAR(50) DEFAULT 'stripe',
          payment_reference VARCHAR(255),
          stripe_session_id VARCHAR(255),
          period_start TIMESTAMP,
          period_end TIMESTAMP,
          status VARCHAR(20) DEFAULT 'paid',
          paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch(e) { /* table already exists */ }

    const colsToAdd = ['subscription_status VARCHAR(20)', 'subscription_amount DECIMAL(10,2)', 'subscription_prorated DECIMAL(10,2)', 'annual_fee_paid_at TIMESTAMP', 'annual_fee_expires_at TIMESTAMP'];
    for (const col of colsToAdd) {
      try { await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col}`); } catch(e) {}
    }

    // Check if already processed (idempotent)
    const existing = await query('SELECT id FROM subscription_payments WHERE stripe_session_id = $1', [session.id]);
    if (existing.rows.length === 0) {
      // Record payment
      await query(
        `INSERT INTO subscription_payments (user_id, amount, payment_method, payment_reference, stripe_session_id, period_start, period_end, status, paid_at)
         VALUES ($1, $2, 'stripe', $3, $4, $5, $6, 'paid', CURRENT_TIMESTAMP)`,
        [partnerId, amount, session.payment_intent || session.id, session.id, periodStart, periodEnd]
      );
    }

    // Activate partner
    await query(
      `UPDATE users SET 
        subscription_status = 'active',
        subscription_amount = $2,
        subscription_prorated = $2,
        annual_fee_paid_at = CURRENT_TIMESTAMP,
        annual_fee_expires_at = $3,
        status = 'active'
       WHERE id = $1`,
        [partnerId, amount, periodEnd]
    );

    await notifyNewDownlineActivation(partnerId);

    // Log activity
    try {
      await query(
        `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)`,
        [partnerId, 'partner_fee_paid', 'user', partnerId, JSON.stringify({ amount, sessionId: session.id })]
      );
    } catch(e) {}

    console.log(`Partner ${partnerId} fee paid (EUR ${amount}), account activated.`);

    // Generate and send invoice (non-blocking)
    try {
      const partnerResult = await query('SELECT * FROM users WHERE id = $1', [partnerId]);
      if (partnerResult.rows.length > 0) {
        const partner = partnerResult.rows[0];
        const { generatePartnerFeeInvoicePDF } = await import('../services/invoice.service.js');
        const { sendEmail } = await import('../services/email.service.js');
        
        const { buffer, invoiceNumber } = await generatePartnerFeeInvoicePDF(partner, amount);
        
        await sendEmail({
          to: partner.email,
          subject: `CLYR Rechnung ${invoiceNumber} - Vertriebspartner Jahresgebuehr`,
          html: `
            <p>Hallo ${partner.first_name},</p>
            <p>vielen Dank fuer Ihre Zahlung der Vertriebspartner-Jahresgebuehr.</p>
            <p><strong>Rechnungsnr.:</strong> ${invoiceNumber}<br>
            <strong>Betrag:</strong> EUR ${amount.toFixed(2)}<br>
            <strong>Status:</strong> Bezahlt</p>
            <p>Anbei finden Sie Ihre Rechnung als PDF.</p>
            <p>Ihr CLYR Team</p>
          `,
          attachments: [{
            filename: `${invoiceNumber}.pdf`,
            content: buffer,
            contentType: 'application/pdf'
          }]
        });
        
        console.log(`Fee invoice ${invoiceNumber} sent to ${partner.email}`);
      }
    } catch (invoiceErr) {
      console.error('Fee invoice generation/send failed (non-critical):', invoiceErr.message);
    }
    return res.redirect(`${baseUrl}/login?fee=success`);

  } catch (err) {
    console.error('Partner fee verification error:', err.message || err);
    return res.redirect(`${baseUrl}/login?fee=error`);
  }
};

// ==========================================
// #37: AFFILIATE SUBSCRIPTION (Intranet-Gebuehr)
// ==========================================

/**
 * Get partner's subscription status
 */
export const getSubscriptionStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const userResult = await query(
    `SELECT subscription_status, subscription_amount, subscription_prorated,
            annual_fee_paid_at, annual_fee_expires_at, status, created_at
     FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new AppError('Partner nicht gefunden', 404);
  }

  const user = userResult.rows[0];

  // Get payment history
  const paymentsResult = await query(
    `SELECT * FROM subscription_payments 
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
    [userId]
  );

  // The annual fee is shown prorated to the remaining days in the current year
  const { amount: annualFee } = getAffiliateFeePeriod();

  res.json({
    status: user.subscription_status || 'unpaid',
    annualFee,
    proratedFee: user.subscription_prorated || annualFee,
    billingPeriod: 'anteilig bis Jahresende',
    paidAt: user.annual_fee_paid_at,
    expiresAt: user.annual_fee_expires_at,
    partnerStatus: user.status,
    isActive: user.status === 'active' && (user.subscription_status === 'active' || user.subscription_status === 'grace'),
    payments: paymentsResult.rows
  });
});

/**
 * Record subscription payment (Admin)
 */
export const recordSubscriptionPayment = asyncHandler(async (req, res) => {
  const { partnerId, amount, paymentMethod, paymentReference } = req.body;

  if (!partnerId) throw new AppError('Partner-ID erforderlich', 400);

  const now = new Date();
  const { periodStart, periodEnd, amount: proratedAmount } = getAffiliateFeePeriod(now);

  await transaction(async (client) => {
    // Record payment
    await client.query(
      `INSERT INTO subscription_payments (user_id, amount, payment_method, payment_reference, period_start, period_end, status, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'paid', CURRENT_TIMESTAMP)`,
      [partnerId, amount || proratedAmount, paymentMethod || 'transfer', paymentReference || '', periodStart, periodEnd]
    );

    // Update user subscription status
    await client.query(
      `UPDATE users SET 
        subscription_status = 'active',
        annual_fee_paid_at = CURRENT_TIMESTAMP,
        annual_fee_expires_at = $2,
        status = CASE WHEN status = 'pending' THEN 'active' ELSE status END
       WHERE id = $1`,
      [partnerId, periodEnd]
    );

    // Log activity
    await client.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'subscription_payment', 'user', $2, $3)`,
      [req.user.id, partnerId, JSON.stringify({ amount, paymentMethod })]
    );
  });

  await notifyNewDownlineActivation(partnerId);

  res.json({ message: 'Zahlung erfasst. Partner-Abonnement aktiviert.' });
});

/**
 * Check for expired subscriptions (Cron job)
 * Partners with expired subscription become passive/inactive (#37)
 */
export const checkExpiredSubscriptions = async () => {
  try {
    const result = await query(
      `UPDATE users SET 
        subscription_status = 'expired',
        status = 'inactive'
       WHERE role = 'partner'
       AND annual_fee_expires_at IS NOT NULL 
       AND annual_fee_expires_at < CURRENT_TIMESTAMP
       AND subscription_status = 'active'
       RETURNING id, email, first_name, last_name`
    );

    if (result.rows.length > 0) {
      console.log(`Subscription expired for ${result.rows.length} partners:`, result.rows.map(r => r.email));

      // Notify admin for each expired/cancelled partner
      try {
        const { sendEmail } = await import('../services/email.service.js');
        const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM || 'service@clyr.shop';
        for (const p of result.rows) {
          await sendEmail({
            to: adminEmail,
            subject: `⚠️ Partner inaktiv: ${p.first_name} ${p.last_name}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                <h2 style="color:#1e293b;border-bottom:2px solid #00B4B4;padding-bottom:10px;">
                  Partnerschaft beendet / abgelaufen
                </h2>
                <p><strong>Name:</strong> ${p.first_name} ${p.last_name}</p>
                <p><strong>E-Mail:</strong> ${p.email}</p>
                <p><strong>Grund:</strong> Jahresgebühr abgelaufen – Partnerschaft wurde nicht verlängert</p>
                <p><strong>Status gesetzt auf:</strong> Inaktiv</p>
                <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
                <p style="color:#64748b;font-size:13px;">
                  Bitte prüfen Sie den Partnerstatus im 
                  <a href="${process.env.FRONTEND_URL || 'https://clyr.shop'}/admin/partners" style="color:#00B4B4;">
                    Admin-Dashboard
                  </a>.
                </p>
              </div>
            `
          }).catch(e => console.error(`Admin expiry notification failed for ${p.email}:`, e.message));
        }
      } catch (emailErr) {
        console.error('Failed to send partner expiry admin notifications:', emailErr.message);
      }
    }

    return result.rows;
  } catch (error) {
    console.error('Check expired subscriptions error:', error);
    return [];
  }
};

// ==========================================
// #54: PROSPECT PROTECTION (6-month)
// ==========================================

/**
 * Add a prospect (Open House attendance, demo, etc.)
 */
export const addProspect = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { email, name, phone, eventType, eventDate, notes } = req.body;

  if (!name && !email) {
    throw new AppError('Name oder E-Mail erforderlich', 400);
  }

  // Check if prospect already protected by another partner
  if (email) {
    const existingProtection = await query(
      `SELECT pp.*, u.first_name, u.last_name 
       FROM prospect_protection pp
       JOIN users u ON pp.partner_id = u.id
       WHERE pp.prospect_email = $1 
       AND pp.protection_expires_at > CURRENT_TIMESTAMP
       AND pp.partner_id != $2`,
      [email.toLowerCase(), userId]
    );

    if (existingProtection.rows.length > 0) {
      const protector = existingProtection.rows[0];
      throw new AppError(
        `Dieser Interessent ist bereits bis ${new Date(protector.protection_expires_at).toLocaleDateString('de-DE')} durch ${protector.first_name} ${protector.last_name.charAt(0)}. geschuetzt.`,
        409
      );
    }
  }

  // Calculate protection expiry (6 months from event date)
  const eventDateParsed = eventDate ? new Date(eventDate) : new Date();
  const expiresAt = new Date(eventDateParsed);
  expiresAt.setMonth(expiresAt.getMonth() + 6);

  const result = await query(
    `INSERT INTO prospect_protection (partner_id, prospect_email, prospect_name, prospect_phone, event_type, event_date, notes, protection_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [userId, email?.toLowerCase() || null, name, phone || null, eventType || 'open_house', eventDateParsed, notes || null, expiresAt]
  );

  res.status(201).json({
    message: 'Interessent registriert. 6-Monats-Schutz aktiv.',
    prospect: result.rows[0]
  });
});

/**
 * Get partner's protected prospects
 */
export const getMyProspects = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const result = await query(
    `SELECT *, 
       CASE WHEN protection_expires_at > CURRENT_TIMESTAMP THEN true ELSE false END as is_active
     FROM prospect_protection 
     WHERE partner_id = $1 
     ORDER BY created_at DESC`,
    [userId]
  );

  const active = result.rows.filter(r => r.is_active);
  const expired = result.rows.filter(r => !r.is_active);

  res.json({
    prospects: result.rows,
    activeCount: active.length,
    expiredCount: expired.length
  });
});

/**
 * Check prospect protection for an order (internal)
 * Returns the partner who has protection, if any
 */
export const checkProspectProtection = async (customerEmail) => {
  if (!customerEmail) return null;

  try {
    const result = await query(
      `SELECT pp.partner_id, u.referral_code, u.first_name, u.last_name
       FROM prospect_protection pp
       JOIN users u ON pp.partner_id = u.id
       WHERE pp.prospect_email = $1
       AND pp.protection_expires_at > CURRENT_TIMESTAMP
       AND pp.is_converted = false
       ORDER BY pp.event_date ASC
       LIMIT 1`,
      [customerEmail.toLowerCase()]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Check prospect protection error:', error);
    return null;
  }
};

// ==========================================
// #53: CROSSLINE SPONSORING PROHIBITION
// ==========================================

/**
 * Check if a partner can be sponsored by a given upline
 * Prevents switching sponsor lines
 */
export const checkCrosslineAllowed = asyncHandler(async (req, res) => {
  const { email, referralCode } = req.body;

  if (!email) {
    return res.json({ allowed: true });
  }

  // Check if this email was already registered as a partner
  const existingPartner = await query(
    'SELECT id, upline_id, status FROM users WHERE email = $1 AND role = $2',
    [email.toLowerCase(), 'partner']
  );

  if (existingPartner.rows.length === 0) {
    // New partner, no crossline issue
    return res.json({ allowed: true });
  }

  const existing = existingPartner.rows[0];

  // If they have an upline and try to register under a different one
  if (existing.upline_id && referralCode) {
    const newUpline = await query(
      'SELECT id FROM users WHERE referral_code = $1',
      [referralCode.toUpperCase()]
    );

    if (newUpline.rows.length > 0 && newUpline.rows[0].id !== existing.upline_id) {
      return res.json({
        allowed: false,
        error: 'Crossline-Sponsoring ist nicht erlaubt. Dieser Partner ist bereits einer anderen Linie zugeordnet.'
      });
    }
  }

  res.json({ allowed: true });
});
