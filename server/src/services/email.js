const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ionos.de',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const from = `"CLYR Solutions" <${process.env.SMTP_FROM || 'service@clyr.shop'}>`;

async function sendOrderConfirmation(order, items, userEmail) {
  const itemRows = items.map(i => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.product_name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">€${parseFloat(i.total_price).toFixed(2)}</td></tr>`).join('');
  await transporter.sendMail({
    from, to: userEmail,
    subject: `Bestellbestätigung ${order.order_number} — CLYR Solutions`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#2D3436;color:#fff;padding:20px;text-align:center">
          <h1 style="margin:0;font-size:24px">CLYR</h1>
          <p style="margin:4px 0 0;opacity:.8">Mehr als Wasser</p>
        </div>
        <div style="padding:30px 20px">
          <h2 style="color:#2D3436">Vielen Dank für Ihre Bestellung!</h2>
          <p>Ihre Bestellnummer: <strong>${order.order_number}</strong></p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <thead><tr style="background:#f8f9fa"><th style="padding:8px;text-align:left">Artikel</th><th style="padding:8px;text-align:center">Menge</th><th style="padding:8px;text-align:right">Preis</th></tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
          <div style="text-align:right;margin-top:10px">
            <p>Zwischensumme: €${parseFloat(order.subtotal).toFixed(2)}</p>
            <p>Versand: ${parseFloat(order.shipping_cost) === 0 ? 'Kostenlos' : '€' + parseFloat(order.shipping_cost).toFixed(2)}</p>
            <p style="font-size:18px;font-weight:bold">Gesamt: €${parseFloat(order.total).toFixed(2)}</p>
          </div>
        </div>
        <div style="background:#f8f9fa;padding:15px 20px;text-align:center;color:#666;font-size:12px">
          <p>CLYR Solutions GmbH · Pappelweg 4b · 9524 St. Magdalen</p>
          <p>service@clyr.shop · www.clyr.shop</p>
        </div>
      </div>`
  });
}

async function sendPartnerWelcome(user, referralCode) {
  await transporter.sendMail({
    from, to: user.email,
    subject: 'Willkommen als CLYR Partner!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#2D3436;color:#fff;padding:20px;text-align:center">
          <h1 style="margin:0;font-size:24px">CLYR</h1>
        </div>
        <div style="padding:30px 20px">
          <h2 style="color:#2D3436">Willkommen im CLYR Partner-Programm!</h2>
          <p>Hallo ${user.first_name || user.firstName},</p>
          <p>Dein Konto wurde erfolgreich erstellt. Hier ist dein persönlicher Empfehlungscode:</p>
          <div style="background:#5DADE2;color:#fff;padding:15px;text-align:center;border-radius:8px;margin:20px 0">
            <p style="font-size:28px;font-weight:bold;margin:0;letter-spacing:3px">${referralCode}</p>
          </div>
          <p>Teile diesen Code mit deinen Kunden, um Provisionen zu verdienen.</p>
          <p>Dein Partner-Dashboard findest du unter: <a href="${process.env.FRONTEND_URL || 'https://clyr.shop'}/partner/dashboard" style="color:#5DADE2">Partner Dashboard</a></p>
        </div>
        <div style="background:#f8f9fa;padding:15px 20px;text-align:center;color:#666;font-size:12px">
          <p>CLYR Solutions GmbH · service@clyr.shop</p>
        </div>
      </div>`
  });
}

async function sendCommissionNotification(partnerEmail, partnerName, amount, type) {
  await transporter.sendMail({
    from, to: partnerEmail,
    subject: `Neue Provision: €${parseFloat(amount).toFixed(2)} — CLYR`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#2D3436;color:#fff;padding:20px;text-align:center"><h1 style="margin:0">CLYR</h1></div>
        <div style="padding:30px 20px">
          <h2>Neue Provision gutgeschrieben</h2>
          <p>Hallo ${partnerName},</p>
          <p>Dir wurde eine neue Provision gutgeschrieben:</p>
          <div style="background:#e8f8f5;padding:15px;border-radius:8px;margin:15px 0">
            <p style="font-size:24px;font-weight:bold;color:#27ae60;margin:0">€${parseFloat(amount).toFixed(2)}</p>
            <p style="color:#666;margin:5px 0 0">${type}</p>
          </div>
        </div>
      </div>`
  });
}

async function sendPasswordReset(email, resetToken) {
  const resetUrl = `${process.env.FRONTEND_URL || 'https://clyr.shop'}/reset-password?token=${resetToken}`;
  await transporter.sendMail({
    from, to: email,
    subject: 'Passwort zurücksetzen — CLYR',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#2D3436;color:#fff;padding:20px;text-align:center"><h1 style="margin:0">CLYR</h1></div>
        <div style="padding:30px 20px">
          <h2>Passwort zurücksetzen</h2>
          <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
          <p><a href="${resetUrl}" style="display:inline-block;background:#5DADE2;color:#fff;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:bold">Neues Passwort setzen</a></p>
          <p style="color:#666;font-size:12px;margin-top:20px">Dieser Link ist 1 Stunde gültig. Wenn Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.</p>
        </div>
      </div>`
  });
}

module.exports = { sendOrderConfirmation, sendPartnerWelcome, sendCommissionNotification, sendPasswordReset, transporter };
