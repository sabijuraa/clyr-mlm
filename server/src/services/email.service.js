import nodemailer from 'nodemailer';
import { getPublicAppUrl } from '../utils/public-url.js';
import { query } from '../config/database.js';

let transporterPromise;

const hasConfiguredSmtp = () => (
  Boolean(process.env.SMTP_HOST) &&
  Boolean(process.env.SMTP_USER) &&
  Boolean(process.env.SMTP_PASS)
);

// Create transporter
const createTransporter = async () => {
  if (hasConfiguredSmtp()) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  if (process.env.NODE_ENV === 'development') {
    try {
      const testAccount = await nodemailer.createTestAccount();
      console.log('No SMTP credentials configured. Using Ethereal test inbox for development.');
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    } catch (error) {
      console.warn('Failed to create Ethereal test account, falling back to JSON transport:', error.message);
      return nodemailer.createTransport({
        jsonTransport: true
      });
    }
  }

  throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.');
};

const getTransporter = async () => {
  if (!transporterPromise) {
    transporterPromise = createTransporter();
  }
  return transporterPromise;
};

/**
 * Format currency helper
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatVariantDescription = (item = {}) => {
  if (item.variant_description) return String(item.variant_description);

  let variantData = item.variant_data;
  if (typeof variantData === 'string') {
    try {
      variantData = JSON.parse(variantData);
    } catch {
      variantData = null;
    }
  }

  if (!variantData || typeof variantData !== 'object') return '';

  return Object.entries(variantData)
    .map(([type, option]) => {
      if (!option) return null;
      const name = option.name || option.label || option.title;
      if (!name) return null;
      const typeLabel = type
        ? `${String(type).charAt(0).toUpperCase()}${String(type).slice(1)}: `
        : '';
      return `${typeLabel}${name}`;
    })
    .filter(Boolean)
    .join(', ');
};

const countryNames = {
  DE: 'Deutschland',
  AT: 'Oesterreich',
  CH: 'Schweiz'
};

const formatAddressHtml = (order, prefix) => {
  const company = order[`${prefix}_company`] || (prefix === 'billing' ? order.customer_company : '');
  const street = order[`${prefix}_street`];
  const zip = order[`${prefix}_zip`];
  const city = order[`${prefix}_city`];
  const country = order[`${prefix}_country`];
  const name = `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.trim();
  const lines = [
    company,
    name,
    street,
    `${zip || ''} ${city || ''}`.trim(),
    countryNames[country] || country
  ].filter(Boolean);

  return lines.map((line) => escapeHtml(line)).join('<br>');
};

const getInternalOrderRecipients = () => {
  const configured = process.env.ORDER_NOTIFICATION_EMAILS
    ? process.env.ORDER_NOTIFICATION_EMAILS.split(',')
    : ['service@clyr.shop', 'technik@clyr.shop'];

  return [...new Set(configured.map((email) => email.trim()).filter(Boolean))];
};

/**
 * Send email - base function
 */
export const sendEmail = async ({ to, cc, bcc, subject, html, text, attachments }) => {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"CLYR" <service@clyr.shop>',
      to,
      cc,
      bcc,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
      attachments: attachments || []
    });

    console.log('Email sent:', info.messageId);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return info;
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
};

/**
 * Order confirmation email
 */
export const sendOrderConfirmation = async (order, items) => {
  const internalRecipients = getInternalOrderRecipients()
    .filter((email) => email.toLowerCase() !== String(order.customer_email || '').toLowerCase());

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${escapeHtml(item.product_name)}</strong>
        ${formatVariantDescription(item) ? `<br><span style="color:#666;font-size:13px;">Variante: ${escapeHtml(formatVariantDescription(item))}</span>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.total)}</td>
    </tr>
  `).join('');

  const billingAddressHtml = formatAddressHtml(order, 'billing');
  const shippingAddressHtml = formatAddressHtml(order, 'shipping') || billingAddressHtml;
  const subtotal = parseFloat(order.subtotal || 0);
  const discount = parseFloat(order.discount_amount || 0);
  const shipping = parseFloat(order.shipping_cost || 0);
  const vat = parseFloat(order.vat_amount || 0);
  const total = parseFloat(order.total || 0);
  let invoiceNumber = order.invoice_number || null;
  if (!invoiceNumber && order.id) {
    try {
      const invoiceResult = await query(
        `SELECT COALESCE(o.invoice_number, i.invoice_number) as invoice_number
         FROM orders o
         LEFT JOIN invoices i ON i.order_id = o.id
         WHERE o.id = $1
         ORDER BY i.created_at DESC
         LIMIT 1`,
        [order.id]
      );
      invoiceNumber = invoiceResult.rows[0]?.invoice_number || null;
    } catch (e) {
      console.error('Invoice number lookup failed:', e.message);
    }
  }
  // No real invoice exists yet (the webhook's generateInvoice call must have failed) —
  // create it now rather than faking the invoice number with order.order_number.
  // This guarantees the PDF the customer receives always matches a real row in
  // the `invoices` table that the admin Billings page reads from.
  if (!invoiceNumber && order.id) {
    try {
      const { generateInvoice } = await import('./invoice.service.js');
      const invoice = await generateInvoice(order.id);
      invoiceNumber = invoice?.invoice_number || null;
    } catch (e) {
      console.error('Invoice creation during email send failed:', order.id, e.message, e.stack);
    }
  }

  let attachments = [];
  if (invoiceNumber) {
    try {
      const { generateInvoicePDF } = await import('./invoice.service.js');
      const pdfBuffer = await generateInvoicePDF({ ...order, invoice_number: invoiceNumber, items }, invoiceNumber);
      attachments = [{
        filename: `Rechnung-${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }];
    } catch (e) {
      console.error('Invoice attachment generation failed:', order.id, e.message);
    }
  } else {
    console.error('No invoice number available — sending confirmation email without invoice PDF for order:', order.id);
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #00B4B4; }
        .logo { font-size: 28px; font-weight: bold; color: #00B4B4; }
        .content { padding: 30px 0; }
        .order-box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .address-grid { display: table; width: 100%; margin: 20px 0; }
        .address-col { display: table-cell; width: 50%; vertical-align: top; padding: 0 10px 0 0; }
        .summary { width: 100%; max-width: 300px; margin-left: auto; }
        .summary td { padding: 4px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #00B4B4; color: white; padding: 12px; text-align: left; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">CLYR</div>
          <p>Vielen Dank für Ihre Bestellung!</p>
        </div>
        
        <div class="content">
          <p>Hallo ${order.customer_first_name},</p>
          <p>Ihre Bestellung #${order.order_number} wurde erfolgreich aufgenommen.</p>

          <div class="address-grid">
            <div class="address-col">
              <strong>Rechnungsadresse</strong><br>
              ${billingAddressHtml}
            </div>
            <div class="address-col">
              <strong>Lieferadresse</strong><br>
              ${shippingAddressHtml}
            </div>
          </div>
          
          <div class="order-box">
            <table>
              <tr>
                <th>Produkt</th>
                <th style="text-align: center;">Menge</th>
                <th style="text-align: right;">Preis</th>
              </tr>
              ${itemsHtml}
            </table>
            <table class="summary" style="margin-top: 20px;">
              <tr><td>Zwischensumme netto:</td><td style="text-align:right;">${formatCurrency(subtotal)}</td></tr>
              ${discount > 0 ? `<tr><td>Rabatt:</td><td style="text-align:right;">-${formatCurrency(discount)}</td></tr>` : ''}
              <tr><td>Versand:</td><td style="text-align:right;">${formatCurrency(shipping)}</td></tr>
              <tr><td>MwSt.:</td><td style="text-align:right;">${formatCurrency(vat)}</td></tr>
              <tr><td style="font-weight:bold;">Gesamt:</td><td style="text-align:right;font-weight:bold;">${formatCurrency(total)}</td></tr>
            </table>
          </div>
          <p>Die Rechnung finden Sie im Anhang.</p>
        </div>
        
        <div class="footer">
          <p>CLYR Solutions GmbH | service@clyr.shop</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Send to customer
  await sendEmail({
    to: order.customer_email,
    cc: internalRecipients,
    subject: `Bestellbestaetigung #${order.order_number}`,
    html,
    attachments
  });

  // Send compact internal notification when no internal CC recipient is configured.
  const adminEmail = process.env.ADMIN_EMAIL || '';
  try {
    if (adminEmail && !internalRecipients.some((email) => email.toLowerCase() === adminEmail.toLowerCase())) {
      await sendEmail({
        to: adminEmail,
        subject: `Neue Bestellung #${order.order_number} - ${formatCurrency(order.total)}`,
        html,
        attachments
      });
    }
  } catch (e) { console.error('Admin notification failed:', e.message); }

  // Send notification to referring partner if exists
  if (order.partner_email) {
    try {
      await sendEmail({
        to: order.partner_email,
        subject: `Neue Bestellung ueber Ihren Empfehlungslink - #${order.order_number}`,
        html: `
          <h2>Gute Nachrichten!</h2>
          <p>Ueber Ihren Empfehlungslink wurde eine neue Bestellung aufgegeben.</p>
          <p><strong>Bestellnummer:</strong> ${order.order_number}</p>
          <p><strong>Betrag:</strong> ${formatCurrency(order.total)}</p>
          <p>Die Provision wird Ihrem Konto gutgeschrieben.</p>
        `
      });
    } catch (e) { console.error('Partner notification failed:', e.message); }
  }
};

/**
 * Shipping notification email
 */
export const sendShippingNotification = async (order, trackingNumber) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #00B4B4; }
        .logo { font-size: 28px; font-weight: bold; color: #00B4B4; }
        .content { padding: 30px 0; }
        .tracking-box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .tracking-number { font-size: 24px; font-weight: bold; color: #00B4B4; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">CLYR</div>
          <p>Ihre Bestellung ist unterwegs!</p>
        </div>
        
        <div class="content">
          <p>Hallo ${order.customer_first_name},</p>
          <p>Ihre Bestellung #${order.order_number} wurde versendet.</p>
          
          <div class="tracking-box">
            <p>Sendungsnummer:</p>
            <div class="tracking-number">${trackingNumber}</div>
          </div>
        </div>
        
        <div class="footer">
          <p>CLYR Solutions GmbH | service@clyr.shop</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: order.customer_email,
    subject: `Versandbestätigung #${order.order_number}`,
    html
  });
};

/**
 * Partner welcome email
 */
export const sendPartnerWelcome = async (partner) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #00B4B4; }
        .logo { font-size: 28px; font-weight: bold; color: #00B4B4; }
        .content { padding: 30px 0; }
        .code-box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .referral-code { font-size: 24px; font-weight: bold; color: #00B4B4; }
        .button { display: inline-block; background: #00B4B4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">CLYR</div>
          <p>Willkommen im Partner-Programm!</p>
        </div>
        
        <div class="content">
          <p>Hallo ${partner.first_name},</p>
          <p>Herzlich willkommen bei CLYR! Ihr Partner-Account wurde erfolgreich erstellt.</p>
          
          <div class="code-box">
            <p>Ihr Empfehlungscode:</p>
            <div class="referral-code">${partner.referral_code}</div>
          </div>
          
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'https://clyr.shop'}/dashboard" class="button">
              Zum Dashboard
            </a>
          </p>
        </div>
        
        <div class="footer">
          <p>CLYR Solutions GmbH | service@clyr.shop</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: partner.email,
    subject: 'Willkommen bei CLYR - Ihr Partner-Account',
    html
  });
};

/**
 * Payout notification email
 */
export const sendPayoutNotification = async (user, payout) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #00B4B4; }
        .logo { font-size: 28px; font-weight: bold; color: #00B4B4; }
        .content { padding: 30px 0; }
        .amount-box { background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .amount { font-size: 32px; font-weight: bold; color: #2e7d32; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">CLYR</div>
          <p>Auszahlung erfolgreich!</p>
        </div>
        
        <div class="content">
          <p>Hallo ${user.first_name},</p>
          <p>Ihre Auszahlung wurde verarbeitet.</p>
          
          <div class="amount-box">
            <p>Auszahlungsbetrag:</p>
            <div class="amount">${formatCurrency(payout.amount)}</div>
          </div>
          
          <p>Der Betrag wird in den nächsten 2-3 Werktagen auf Ihrem Konto gutgeschrieben.</p>
        </div>
        
        <div class="footer">
          <p>CLYR Solutions GmbH | service@clyr.shop</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Auszahlung verarbeitet - CLYR',
    html
  });
};

/**
 * Password reset email
 */
export const sendPasswordReset = async (user, resetToken) => {
  const resetUrl = `${getPublicAppUrl()}/reset-password?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #00B4B4; }
        .logo { font-size: 28px; font-weight: bold; color: #00B4B4; }
        .content { padding: 30px 0; }
        .button { display: inline-block; background: #00B4B4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">CLYR</div>
          <p>Passwort zurücksetzen</p>
        </div>
        
        <div class="content">
          <p>Hallo ${user.first_name},</p>
          <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
          <p>Klicken Sie auf den Button unten, um ein neues Passwort festzulegen:</p>
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" class="button">Passwort zurücksetzen</a>
          </p>
          
          <p style="color: #666; font-size: 12px;">
            Dieser Link ist 1 Stunde gültig. Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.
          </p>
        </div>
        
        <div class="footer">
          <p>CLYR Solutions GmbH | service@clyr.shop</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Passwort zurücksetzen - CLYR',
    html
  });
};
