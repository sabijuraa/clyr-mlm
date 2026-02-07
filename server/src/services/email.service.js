import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
  if (process.env.NODE_ENV === 'development') {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const transporter = createTransporter();

/**
 * Format currency helper
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

/**
 * Send email - base function
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: `"CLYR" <${process.env.SMTP_FROM || 'noreply@clyr.at'}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '')
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
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.product_name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.total)}</td>
    </tr>
  `).join('');

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
          
          <div class="order-box">
            <table>
              <tr>
                <th>Produkt</th>
                <th style="text-align: center;">Menge</th>
                <th style="text-align: right;">Preis</th>
              </tr>
              ${itemsHtml}
            </table>
            <div style="margin-top: 20px; text-align: right;">
              <strong>Gesamt: ${formatCurrency(order.total)}</strong>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>CLYR GmbH | support@clyr.at</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: order.customer_email,
    subject: `Bestellbestätigung #${order.order_number}`,
    html
  });
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
          <p>CLYR GmbH | support@clyr.at</p>
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
            <a href="${process.env.FRONTEND_URL || 'https://clyr.at'}/dashboard" class="button">
              Zum Dashboard
            </a>
          </p>
        </div>
        
        <div class="footer">
          <p>CLYR GmbH | support@clyr.at</p>
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
          <p>CLYR GmbH | support@clyr.at</p>
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
  const resetUrl = `${process.env.FRONTEND_URL || 'https://clyr.at'}/reset-password?token=${resetToken}`;
  
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
          <p>CLYR GmbH | support@clyr.at</p>
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
