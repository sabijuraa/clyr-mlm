/**
 * GDPR Controller
 * ================
 * Handles GDPR compliance: data export, deletion, and consent management
 * 
 * Requirements:
 * - Data export (all user data as JSON/PDF)
 * - Data deletion (anonymization or hard delete)
 * - Consent management (tracking, withdrawal)
 */

import { query, transaction } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import PDFDocument from 'pdfkit';

/**
 * Export all user data (GDPR Art. 20 - Data Portability)
 * GET /api/gdpr/export
 */
export const exportUserData = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Gather all user data
  const userData = await gatherAllUserData(userId);

  // Return as JSON
  res.setHeader('Content-Disposition', `attachment; filename="my-data-${Date.now()}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.json({
    exportDate: new Date().toISOString(),
    exportedBy: 'CLYR Platform',
    gdprArticle: 'Art. 20 DSGVO - Recht auf Datenübertragbarkeit',
    data: userData
  });
});

/**
 * Export user data as PDF
 * GET /api/gdpr/export/pdf
 */
export const exportUserDataPDF = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Gather all user data
  const userData = await gatherAllUserData(userId);

  // Generate PDF
  const doc = new PDFDocument({ margin: 50 });
  
  res.setHeader('Content-Disposition', `attachment; filename="my-data-${Date.now()}.pdf"`);
  res.setHeader('Content-Type', 'application/pdf');
  
  doc.pipe(res);

  // Header
  doc.fontSize(20).text('DSGVO Datenexport', { align: 'center' });
  doc.fontSize(12).text('CLYR Solutions GmbH', { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text(`Exportdatum: ${new Date().toLocaleString('de-DE')}`, { align: 'center' });
  doc.text('Art. 20 DSGVO - Recht auf Datenübertragbarkeit', { align: 'center' });
  doc.moveDown(2);

  // Personal Data
  doc.fontSize(14).text('1. Persönliche Daten', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);
  
  const profile = userData.profile;
  if (profile) {
    doc.text(`Name: ${profile.first_name} ${profile.last_name}`);
    doc.text(`E-Mail: ${profile.email}`);
    doc.text(`Telefon: ${profile.phone || 'Nicht angegeben'}`);
    doc.text(`Firma: ${profile.company || 'Nicht angegeben'}`);
    doc.text(`USt-IdNr.: ${profile.vat_id || 'Nicht angegeben'}`);
    doc.text(`Adresse: ${profile.street || ''}, ${profile.zip || ''} ${profile.city || ''}, ${profile.country || ''}`);
    doc.text(`Registriert am: ${new Date(profile.created_at).toLocaleString('de-DE')}`);
  }
  doc.moveDown();

  // Orders
  doc.fontSize(14).text('2. Bestellungen', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);
  
  if (userData.orders && userData.orders.length > 0) {
    userData.orders.forEach((order, i) => {
      doc.text(`${i + 1}. Bestellung #${order.order_number} - ${new Date(order.created_at).toLocaleDateString('de-DE')}`);
      doc.text(`   Status: ${order.status}, Summe: ${order.total} EUR`);
    });
  } else {
    doc.text('Keine Bestellungen vorhanden.');
  }
  doc.moveDown();

  // Commissions (if partner)
  if (userData.commissions && userData.commissions.length > 0) {
    doc.fontSize(14).text('3. Provisionen', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    
    userData.commissions.forEach((comm, i) => {
      doc.text(`${i + 1}. ${new Date(comm.created_at).toLocaleDateString('de-DE')} - ${comm.amount} EUR (${comm.status})`);
    });
    doc.moveDown();
  }

  // Payouts (if partner)
  if (userData.payouts && userData.payouts.length > 0) {
    doc.fontSize(14).text('4. Auszahlungen', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    
    userData.payouts.forEach((payout, i) => {
      doc.text(`${i + 1}. ${new Date(payout.created_at).toLocaleDateString('de-DE')} - ${payout.amount} EUR (${payout.status})`);
    });
    doc.moveDown();
  }

  // Activity Log
  doc.fontSize(14).text('5. Aktivitätsprotokoll', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);
  
  if (userData.activity && userData.activity.length > 0) {
    userData.activity.slice(0, 50).forEach((act) => {
      doc.text(`${new Date(act.created_at).toLocaleString('de-DE')} - ${act.action}`);
    });
    if (userData.activity.length > 50) {
      doc.text(`... und ${userData.activity.length - 50} weitere Einträge`);
    }
  } else {
    doc.text('Keine Aktivitäten protokolliert.');
  }

  // Footer
  doc.moveDown(2);
  doc.fontSize(8).text('Dieser Export wurde automatisch generiert gemäß Art. 20 DSGVO.', { align: 'center' });
  doc.text('Bei Fragen wenden Sie sich an: datenschutz@clyr-water.com', { align: 'center' });

  doc.end();
});

/**
 * Delete user data (GDPR Art. 17 - Right to Erasure)
 * DELETE /api/gdpr/delete-account
 */
export const deleteUserData = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { password, confirmDeletion, reason } = req.body;

  if (!confirmDeletion || confirmDeletion !== 'DELETE_MY_DATA') {
    throw new AppError('Bitte bestätigen Sie die Löschung mit "DELETE_MY_DATA"', 400);
  }

  // Verify password
  const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (userResult.rows.length === 0) {
    throw new AppError('Benutzer nicht gefunden', 404);
  }

  const bcrypt = await import('bcryptjs');
  const isValid = await bcrypt.compare(password, userResult.rows[0].password_hash);
  if (!isValid) {
    throw new AppError('Falsches Passwort', 401);
  }

  // Check for pending payouts or open orders
  const pendingCheck = await query(`
    SELECT 
      (SELECT COUNT(*) FROM orders WHERE customer_email = (SELECT email FROM users WHERE id = $1) AND status IN ('pending', 'processing')) as pending_orders,
      (SELECT COUNT(*) FROM payouts WHERE user_id = $1 AND status IN ('pending', 'approved')) as pending_payouts
  `, [userId]);

  const { pending_orders, pending_payouts } = pendingCheck.rows[0];
  
  if (parseInt(pending_orders) > 0 || parseInt(pending_payouts) > 0) {
    throw new AppError(
      `Löschung nicht möglich: ${pending_orders} offene Bestellung(en), ${pending_payouts} ausstehende Auszahlung(en). Bitte warten Sie bis diese abgeschlossen sind.`,
      400
    );
  }

  // Perform anonymization (we keep records for legal/tax reasons but remove personal data)
  await transaction(async (client) => {
    // Log deletion request
    await client.query(`
      INSERT INTO activity_log (user_id, action, details, ip_address)
      VALUES ($1, 'gdpr_deletion_requested', $2, $3)
    `, [userId, JSON.stringify({ reason, timestamp: new Date() }), req.ip]);

    // Anonymize user data (keep for 10 years per German tax law)
    await client.query(`
      UPDATE users SET
        email = CONCAT('deleted_', id, '@anonymized.local'),
        password_hash = 'DELETED',
        first_name = 'Gelöscht',
        last_name = 'Gelöscht',
        phone = NULL,
        company = NULL,
        vat_id = NULL,
        street = NULL,
        zip = NULL,
        city = NULL,
        iban = 'DELETED',
        bic = NULL,
        bank_name = NULL,
        account_holder = NULL,
        passport_url = NULL,
        bank_card_url = NULL,
        trade_license_url = NULL,
        status = 'deleted',
        email_verified = false,
        email_verification_token = NULL,
        password_reset_token = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [userId]);

    // Delete refresh tokens
    await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

    // Anonymize activity log (keep actions, remove details)
    await client.query(`
      UPDATE activity_log SET
        details = '{"anonymized": true}',
        ip_address = NULL
      WHERE user_id = $1
    `, [userId]);

    // Note: We keep orders, commissions, payouts for legal/accounting reasons
    // but the user reference is now anonymized
  });

  res.json({
    success: true,
    message: 'Ihr Konto wurde erfolgreich gelöscht. Alle persönlichen Daten wurden anonymisiert gemäß Art. 17 DSGVO.',
    note: 'Einige Daten werden aus steuerrechtlichen Gründen für 10 Jahre aufbewahrt (§147 AO).'
  });
});

/**
 * Get consent status
 * GET /api/gdpr/consents
 */
export const getConsents = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  
  // For logged-in users, get from database
  if (userId) {
    const result = await query(`
      SELECT 
        consent_marketing,
        consent_analytics,
        consent_cookies,
        consent_updated_at
      FROM users WHERE id = $1
    `, [userId]);

    if (result.rows.length > 0) {
      return res.json({
        marketing: result.rows[0].consent_marketing || false,
        analytics: result.rows[0].consent_analytics || false,
        cookies: result.rows[0].consent_cookies || false,
        lastUpdated: result.rows[0].consent_updated_at
      });
    }
  }

  // Default for non-logged in users
  res.json({
    marketing: false,
    analytics: false,
    cookies: false,
    lastUpdated: null
  });
});

/**
 * Update consents
 * PUT /api/gdpr/consents
 */
export const updateConsents = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { marketing, analytics, cookies } = req.body;

  if (userId) {
    await query(`
      UPDATE users SET
        consent_marketing = $2,
        consent_analytics = $3,
        consent_cookies = $4,
        consent_updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [userId, marketing || false, analytics || false, cookies || false]);

    // Log consent change
    await query(`
      INSERT INTO activity_log (user_id, action, details, ip_address)
      VALUES ($1, 'consent_updated', $2, $3)
    `, [userId, JSON.stringify({ marketing, analytics, cookies }), req.ip]);
  }

  res.json({
    success: true,
    message: 'Einwilligungen wurden aktualisiert.',
    consents: { marketing, analytics, cookies }
  });
});

/**
 * Withdraw all consents
 * DELETE /api/gdpr/consents
 */
export const withdrawAllConsents = asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  if (userId) {
    await query(`
      UPDATE users SET
        consent_marketing = false,
        consent_analytics = false,
        consent_cookies = false,
        consent_updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [userId]);

    await query(`
      INSERT INTO activity_log (user_id, action, details, ip_address)
      VALUES ($1, 'consent_withdrawn_all', '{}', $2)
    `, [userId, req.ip]);
  }

  res.json({
    success: true,
    message: 'Alle Einwilligungen wurden widerrufen.'
  });
});

/**
 * Get data processing info
 * GET /api/gdpr/processing-info
 */
export const getProcessingInfo = asyncHandler(async (req, res) => {
  res.json({
    controller: {
      name: 'CLYR Solutions GmbH',
      address: 'Deutschland',
      email: 'datenschutz@clyr-water.com'
    },
    commissionProcessor: {
      name: 'CLYR Solutions GmbH',
      address: 'Österreich',
      purpose: 'Provisionsabrechnung für Partner'
    },
    purposes: [
      {
        purpose: 'Vertragserfüllung',
        legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO',
        data: ['Name', 'E-Mail', 'Adresse', 'Bestelldaten'],
        retention: '10 Jahre (steuerrechtliche Aufbewahrungspflicht)'
      },
      {
        purpose: 'Partnerprogramm',
        legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO',
        data: ['Bankdaten', 'Steuer-ID', 'Provisionen'],
        retention: '10 Jahre'
      },
      {
        purpose: 'Marketing',
        legalBasis: 'Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)',
        data: ['E-Mail', 'Präferenzen'],
        retention: 'Bis zum Widerruf'
      },
      {
        purpose: 'Analyse',
        legalBasis: 'Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)',
        data: ['Nutzungsdaten', 'IP-Adresse (anonymisiert)'],
        retention: '26 Monate'
      }
    ],
    rights: [
      'Auskunft (Art. 15 DSGVO)',
      'Berichtigung (Art. 16 DSGVO)',
      'Löschung (Art. 17 DSGVO)',
      'Einschränkung (Art. 18 DSGVO)',
      'Datenübertragbarkeit (Art. 20 DSGVO)',
      'Widerspruch (Art. 21 DSGVO)',
      'Beschwerde bei Aufsichtsbehörde'
    ]
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function gatherAllUserData(userId) {
  // Profile
  const profileResult = await query(`
    SELECT 
      id, email, first_name, last_name, phone, role, status,
      referral_code, company, vat_id, is_kleinunternehmer,
      street, zip, city, country,
      wallet_balance, total_earned, total_paid_out,
      own_sales_count, own_sales_volume, team_sales_count, team_sales_volume,
      created_at, updated_at, last_login_at
    FROM users WHERE id = $1
  `, [userId]);

  // Orders
  const ordersResult = await query(`
    SELECT 
      order_number, status, subtotal, shipping, vat, total,
      billing_address, shipping_address, created_at
    FROM orders 
    WHERE customer_email = (SELECT email FROM users WHERE id = $1)
    ORDER BY created_at DESC
  `, [userId]);

  // Commissions
  const commissionsResult = await query(`
    SELECT 
      amount, status, type, commission_rate, created_at, released_at
    FROM commissions 
    WHERE user_id = $1
    ORDER BY created_at DESC
  `, [userId]);

  // Payouts
  const payoutsResult = await query(`
    SELECT 
      amount, status, payout_method, created_at, processed_at
    FROM payouts 
    WHERE user_id = $1
    ORDER BY created_at DESC
  `, [userId]);

  // Activity Log
  const activityResult = await query(`
    SELECT 
      action, details, ip_address, created_at
    FROM activity_log 
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 500
  `, [userId]);

  // Subscriptions
  const subscriptionsResult = await query(`
    SELECT 
      status, interval_months, next_billing_date, created_at
    FROM subscriptions 
    WHERE user_id = $1
    ORDER BY created_at DESC
  `, [userId]);

  // Academy Progress
  const academyResult = await query(`
    SELECT 
      content_id, completed, progress_percent, completed_at
    FROM academy_progress 
    WHERE user_id = $1
  `, [userId]);

  return {
    profile: profileResult.rows[0] || null,
    orders: ordersResult.rows,
    commissions: commissionsResult.rows,
    payouts: payoutsResult.rows,
    activity: activityResult.rows,
    subscriptions: subscriptionsResult.rows,
    academyProgress: academyResult.rows
  };
}
