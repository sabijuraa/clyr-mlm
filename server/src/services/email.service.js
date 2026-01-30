import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
  if (process.env.NODE_ENV === 'development') {
    // Use Ethereal for testing in development
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
 * Send email
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Still und Laut" <${process.env.SMTP_FROM || 'noreply@freshliving.at'}>`,
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
        .totals { margin-top: 20px; }
        .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
        .total-row.final { font-size: 18px; font-weight: bold; border-top: 2px solid #333; margin-top: 10px; padding-top: 15px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee; }
        .button { display: inline-block; background: #00B4B4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Still und Laut</div>
          <p>Vielen Dank für Ihre Bestellung!</p>
        </div>
        
        <div class="content">
          <p>Hallo ${order.customer_first_name},</p>
          <p>Ihre Bestellung wurde erfolgreich aufgenommen. Hier sind die Details:</p>
          
          <div class="order-box">
            <p><strong>Bestellnummer:</strong> ${order.order_number}</p>
            <p><strong>Bestelldatum:</strong> ${new Date(order.created_at).toLocaleDateString('de-DE')}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Produkt</th>
                <th style="text-align: center;">Menge</th>
                <th style="text-align: right;">Preis</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>Zwischensumme:</span>
              <span>${formatCurrency(order.subtotal)}</span>
            </div>
            <div class="total-row">
              <span>Versandkosten:</span>
              <span>${formatCurrency(order.shipping_cost)}</span>
            </div>
            <div class="total-row">
              <span>MwSt. (${order.vat_rate}%):</span>
              <span>${formatCurrency(order.vat_amount)}</span>
            </div>
            <div class="total-row final">
              <span>Gesamtbetrag:</span>
              <span>${formatCurrency(order.total)}</span>
            </div>
          </div>

          <h3 style="margin-top: 30px;">Lieferadresse:</h3>
          <p>
            ${order.customer_first_name} ${order.customer_last_name}<br>
            ${order.shipping_street || order.billing_street}<br>
            ${order.shipping_zip || order.billing_zip} ${order.shipping_city || order.billing_city}<br>
            ${order.shipping_country || order.billing_country}
          </p>

          <p style="margin-top: 30px;">Wir werden Sie benachrichtigen, sobald Ihre Bestellung versandt wurde.</p>
          
          <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
          
          <p>Mit freundlichen Grüßen,<br>Ihr Still und Laut Team</p>
        </div>
        
        <div class="footer">
          <p>FreshLiving GmbH | Musterstraße 1 | 1010 Wien | Österreich</p>
          <p>E-Mail: info@freshliving.at | Tel: +43 1 234 5678</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: order.customer_email,
    subject: `Bestellbestätigung - ${order.order_number}`,
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
        .tracking-box { background: #e8f4f4; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .tracking-number { font-size: 24px; font-weight: bold; color: #00B4B4; letter-spacing: 2px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Still und Laut</div>
          <p>Ihre Bestellung ist unterwegs! 🚚</p>
        </div>
        
        <div class="content">
          <p>Hallo ${order.customer_first_name},</p>
          <p>Gute Nachrichten! Ihre Bestellung <strong>${order.order_number}</strong> wurde versandt.</p>
          
          ${trackingNumber ? `
          <div class="tracking-box">
            <p>Sendungsnummer:</p>
            <p class="tracking-number">${trackingNumber}</p>
            <p style="margin-top: 15px;">
              <a href="https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${trackingNumber}" 
                 style="color: #00B4B4;">Sendung verfolgen →</a>
            </p>
          </div>
          ` : ''}

          <h3>Lieferadresse:</h3>
          <p>
            ${order.customer_first_name} ${order.customer_last_name}<br>
            ${order.shipping_street || order.billing_street}<br>
            ${order.shipping_zip || order.billing_zip} ${order.shipping_city || order.billing_city}
          </p>

          <p style="margin-top: 30px;">Die voraussichtliche Lieferzeit beträgt 2-4 Werktage.</p>
          
          <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
          
          <p>Mit freundlichen Grüßen,<br>Ihr Still und Laut Team</p>
        </div>
        
        <div class="footer">
          <p>FreshLiving GmbH | Musterstraße 1 | 1010 Wien | Österreich</p>
          <p>E-Mail: info@freshliving.at | Tel: +43 1 234 5678</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: order.customer_email,
    subject: `Versandbestätigung - ${order.order_number}`,
    html
  });
};

/**
 * Partner registration welcome email
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
        .highlight-box { background: linear-gradient(135deg, #00B4B4 0%, #008080 100%); color: white; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .referral-code { font-size: 32px; font-weight: bold; letter-spacing: 3px; margin: 10px 0; }
        .steps { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .step { display: flex; margin: 15px 0; }
        .step-number { background: #00B4B4; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0; }
        .button { display: inline-block; background: #00B4B4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Still und Laut</div>
          <p>Willkommen bei FreshLiving!</p>
        </div>
        
        <div class="content">
          <p>Hallo ${partner.first_name},</p>
          <p>Herzlich willkommen im FreshLiving Partner-Programm! Wir freuen uns, Sie in unserem Team begrüßen zu dürfen.</p>
          
          <div class="highlight-box">
            <p>Ihr persönlicher Empfehlungscode:</p>
            <p class="referral-code">${partner.referral_code}</p>
            <p style="font-size: 14px; opacity: 0.9;">Teilen Sie diesen Code mit Ihren Kunden</p>
          </div>

          <div class="steps">
            <h3 style="margin-top: 0;">Ihre nächsten Schritte:</h3>
            <div class="step">
              <div class="step-number">1</div>
              <div>
                <strong>Zahlen Sie die Jahresgebühr</strong><br>
                Um Ihr Konto zu aktivieren, zahlen Sie bitte die anteilige Jahresgebühr.
              </div>
            </div>
            <div class="step">
              <div class="step-number">2</div>
              <div>
                <strong>Erkunden Sie Ihr Dashboard</strong><br>
                Loggen Sie sich ein und entdecken Sie alle Funktionen.
              </div>
            </div>
            <div class="step">
              <div class="step-number">3</div>
              <div>
                <strong>Teilen Sie Ihren Link</strong><br>
                Beginnen Sie, Ihre persönlichen Empfehlungslinks zu teilen.
              </div>
            </div>
          </div>

          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/login" class="button">Zum Dashboard →</a>
          </p>

          <h3>Ihre Vorteile als Partner:</h3>
          <ul>
            <li>Bis zu 36% Provision auf alle Verkäufe</li>
            <li>Differenzprovisionen aus Ihrem Team</li>
            <li>Attraktive Boni bei Rangaufstiegen</li>
            <li>Persönliches Dashboard mit Echtzeit-Statistiken</li>
          </ul>
          
          <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
          
          <p>Viel Erfolg und herzliche Grüße,<br>Ihr Still und Laut Team</p>
        </div>
        
        <div class="footer">
          <p>FreshLiving GmbH | Musterstraße 1 | 1010 Wien | Österreich</p>
          <p>E-Mail: partner@freshliving.at | Tel: +43 1 234 5678</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: partner.email,
    subject: 'Willkommen bei FreshLiving - Ihr Partner-Konto wurde erstellt',
    html
  });
};

/**
 * Commission payout notification
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
        .amount-box { background: #e8f4f4; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .amount { font-size: 36px; font-weight: bold; color: #00B4B4; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Still und Laut</div>
          <p>Auszahlung verarbeitet! 💰</p>
        </div>
        
        <div class="content">
          <p>Hallo ${user.first_name},</p>
          <p>Ihre Provisionsauszahlung wurde erfolgreich verarbeitet.</p>
          
          <div class="amount-box">
            <p>Auszahlungsbetrag:</p>
            <p class="amount">${formatCurrency(payout.amount)}</p>
            <p style="color: #666; font-size: 14px; margin-top: 10px;">
              Referenz: ${payout.reference}
            </p>
          </div>

          <p><strong>Überwiesen auf:</strong><br>
          IBAN: ${payout.iban.substring(0, 4)}****${payout.iban.slice(-4)}</p>

          <p>Die Überweisung sollte innerhalb von 1-3 Werktagen auf Ihrem Konto eingehen.</p>
          
          <p>Weiter so! 🎉</p>
          
          <p>Mit freundlichen Grüßen,<br>Ihr Still und Laut Team</p>
        </div>
        
        <div class="footer">
          <p>FreshLiving GmbH | Musterstraße 1 | 1010 Wien | Österreich</p>
          <p>E-Mail: partner@freshliving.at | Tel: +43 1 234 5678</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: `Auszahlung verarbeitet - ${formatCurrency(payout.amount)}`,
    html
  });
};

/**
 * Password reset email
 */
export const sendPasswordReset = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/passwort-reset?token=${resetToken}`;

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
        .button { display: inline-block; background: #00B4B4; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-size: 16px; }
        .warning { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Still und Laut</div>
        </div>
        
        <div class="content">
          <p>Hallo ${user.first_name},</p>
          <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
          
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Passwort zurücksetzen</a>
          </p>

          <p>Oder kopieren Sie diesen Link in Ihren Browser:<br>
          <a href="${resetUrl}" style="color: #00B4B4; word-break: break-all;">${resetUrl}</a></p>

          <div class="warning">
            <strong>⚠️ Wichtig:</strong> Dieser Link ist nur 1 Stunde gültig.
          </div>

          <p>Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren. Ihr Passwort wird nicht geändert.</p>
          
          <p>Mit freundlichen Grüßen,<br>Ihr Still und Laut Team</p>
        </div>
        
        <div class="footer">
          <p>FreshLiving GmbH | Musterstraße 1 | 1010 Wien | Österreich</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Passwort zurücksetzen - Still und Laut',
    html
  });
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

// Named exports
export {
  sendEmail,
  sendOrderConfirmation,
  sendShippingNotification,
  sendPartnerWelcome,
  sendPayoutNotification,
  sendPasswordReset
};