/**
 * Newsletter Service
 * Email marketing and subscriber management
 */

import { query } from '../config/database.js';
import crypto from 'crypto';
import { sendEmail } from './email.service.js';

/**
 * Subscribe to newsletter
 */
export const subscribe = async (email, options = {}) => {
  const { firstName, lastName, source, language = 'de', preferences } = options;
  
  // Check if already subscribed
  const existing = await query(
    'SELECT id, status FROM newsletter_subscribers WHERE email = $1',
    [email.toLowerCase()]
  );
  
  if (existing.rows.length > 0) {
    const subscriber = existing.rows[0];
    
    if (subscriber.status === 'active') {
      return { success: true, message: 'Bereits angemeldet', alreadySubscribed: true };
    }
    
    if (subscriber.status === 'unsubscribed') {
      // Re-subscribe
      const token = crypto.randomBytes(32).toString('hex');
      await query(`
        UPDATE newsletter_subscribers 
        SET status = 'pending', 
            confirmation_token = $1,
            unsubscribed_at = NULL,
            updated_at = NOW()
        WHERE id = $2
      `, [token, subscriber.id]);
      
      await sendConfirmationEmail(email, token, language).catch(e => console.error('Newsletter confirmation email failed:', e.message));
      return { success: true, message: 'Erfolgreich angemeldet! Bestätigungs-E-Mail wird gesendet.', resubscribed: true };
    }
  }
  
  // New subscription
  const token = crypto.randomBytes(32).toString('hex');
  
  await query(`
    INSERT INTO newsletter_subscribers (
      email, first_name, last_name, source, language, 
      preferences, confirmation_token, ip_address
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    email.toLowerCase(),
    firstName,
    lastName,
    source || 'website',
    language,
    JSON.stringify(preferences || { promotions: true, news: true, tips: true }),
    token,
    options.ipAddress
  ]);
  
  await sendConfirmationEmail(email, token, language).catch(e => console.error('Newsletter confirmation email failed:', e.message));
  
  return { success: true, message: 'Erfolgreich angemeldet! Bestätigungs-E-Mail wird gesendet.' };
};

/**
 * Confirm subscription (double opt-in)
 */
export const confirmSubscription = async (token) => {
  const result = await query(`
    UPDATE newsletter_subscribers 
    SET status = 'active', 
        confirmed_at = NOW(),
        confirmation_token = NULL
    WHERE confirmation_token = $1 AND status = 'pending'
    RETURNING id, email
  `, [token]);
  
  if (result.rows.length === 0) {
    throw new Error('Ungültiger oder abgelaufener Link');
  }
  
  return { success: true, email: result.rows[0].email };
};

/**
 * Unsubscribe from newsletter
 */
export const unsubscribe = async (email, reason = null) => {
  await query(`
    UPDATE newsletter_subscribers 
    SET status = 'unsubscribed',
        unsubscribed_at = NOW(),
        unsubscribe_reason = $1
    WHERE email = $2 AND status = 'active'
  `, [reason, email.toLowerCase()]);
  
  return { success: true };
};

/**
 * Update subscriber preferences
 */
export const updatePreferences = async (email, preferences) => {
  await query(`
    UPDATE newsletter_subscribers 
    SET preferences = $1, updated_at = NOW()
    WHERE email = $2
  `, [JSON.stringify(preferences), email.toLowerCase()]);
  
  return { success: true };
};

/**
 * Get subscribers
 */
export const getSubscribers = async (filters = {}) => {
  const { status, source, page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramCount = 0;
  
  if (status) {
    params.push(status);
    whereClause += ` AND status = $${++paramCount}`;
  }
  
  if (source) {
    params.push(source);
    whereClause += ` AND source = $${++paramCount}`;
  }
  
  const countResult = await query(
    `SELECT COUNT(*) FROM newsletter_subscribers ${whereClause}`,
    params
  );
  
  params.push(limit, offset);
  const result = await query(`
    SELECT id, email, first_name, last_name, status, source, 
           language, preferences, confirmed_at, created_at
    FROM newsletter_subscribers 
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `, params);
  
  return {
    subscribers: result.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    pages: Math.ceil(countResult.rows[0].count / limit)
  };
};

/**
 * Get subscriber stats
 */
export const getStats = async () => {
  const result = await query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'active') as active,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'unsubscribed') as unsubscribed,
      COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
      COUNT(*) as total
    FROM newsletter_subscribers
  `);
  
  return result.rows[0];
};

/**
 * Create email campaign
 */
export const createCampaign = async (campaignData, createdBy) => {
  const {
    name, subject, subjectEn, contentHtml, contentHtmlEn, contentText,
    targetAudience, targetFilter, scheduledAt
  } = campaignData;
  
  const result = await query(`
    INSERT INTO email_campaigns (
      name, subject, subject_en, content_html, content_html_en, content_text,
      target_audience, target_filter, scheduled_at, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [
    name, subject, subjectEn || null, contentHtml || '', contentHtmlEn || null, contentText || null,
    targetAudience || 'newsletter',
    JSON.stringify(targetFilter || {}),
    scheduledAt,
    createdBy
  ]);
  
  return result.rows[0];
};

/**
 * Send campaign
 */
export const sendCampaign = async (campaignId) => {
  // Get campaign
  const campaignResult = await query(
    'SELECT * FROM email_campaigns WHERE id = $1',
    [campaignId]
  );
  
  if (campaignResult.rows.length === 0) {
    throw new Error('Kampagne nicht gefunden');
  }
  
  const campaign = campaignResult.rows[0];
  
  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    throw new Error('Kampagne kann nicht gesendet werden');
  }
  
  // Get recipients based on target audience
  let recipientQuery = '';
  switch (campaign.target_audience) {
    case 'newsletter':
      recipientQuery = `
        SELECT email, first_name, language 
        FROM newsletter_subscribers 
        WHERE status = 'active'
      `;
      break;
    case 'customers':
      recipientQuery = `
        SELECT DISTINCT email, first_name, 'de' as language 
        FROM customers
      `;
      break;
    case 'partners':
      recipientQuery = `
        SELECT email, first_name, 'de' as language 
        FROM users 
        WHERE role = 'partner' AND status = 'active'
      `;
      break;
    default:
      recipientQuery = `
        SELECT email, first_name, language 
        FROM newsletter_subscribers 
        WHERE status = 'active'
      `;
  }
  
  const recipients = await query(recipientQuery);
  
  // Update campaign status
  await query(`
    UPDATE email_campaigns 
    SET status = 'sending', 
        total_recipients = $1,
        sent_at = NOW()
    WHERE id = $2
  `, [recipients.rows.length, campaignId]);
  
  // Send emails (in production, use a queue)
  let sentCount = 0;
  let bounceCount = 0;
  
  for (const recipient of recipients.rows) {
    try {
      const content = recipient.language === 'en' && campaign.content_html_en 
        ? campaign.content_html_en 
        : campaign.content_html;
      
      const subject = recipient.language === 'en' && campaign.subject_en
        ? campaign.subject_en
        : campaign.subject;
      
      await sendEmail({
        to: recipient.email,
        subject,
        html: personalizeContent(content, recipient)
      });
      
      sentCount++;
    } catch (err) {
      bounceCount++;
      console.error(`Failed to send to ${recipient.email}:`, err.message);
    }
    
    // Update progress every 10 emails
    if (sentCount % 10 === 0) {
      await query(`
        UPDATE email_campaigns 
        SET sent_count = $1, bounce_count = $2
        WHERE id = $3
      `, [sentCount, bounceCount, campaignId]);
    }
  }
  
  // Final update
  await query(`
    UPDATE email_campaigns 
    SET status = 'sent',
        sent_count = $1,
        bounce_count = $2
    WHERE id = $3
  `, [sentCount, bounceCount, campaignId]);
  
  return { sentCount, bounceCount, totalRecipients: recipients.rows.length };
};

/**
 * Get campaigns
 */
export const getCampaigns = async (filters = {}) => {
  const { status, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramCount = 0;
  
  if (status) {
    params.push(status);
    whereClause += ` AND status = $${++paramCount}`;
  }
  
  params.push(limit, offset);
  const result = await query(`
    SELECT id, name, subject, target_audience, status,
           total_recipients, sent_count, open_count, click_count,
           scheduled_at, sent_at, created_at
    FROM email_campaigns 
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `, params);
  
  return result.rows;
};

// Helper: Send confirmation email
async function sendConfirmationEmail(email, token, language = 'de') {
  const confirmUrl = `${process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://clyr.shop'}/api/newsletter/confirm/${token}`;
  
  const subjects = {
    de: 'Bitte bestätigen Sie Ihre Newsletter-Anmeldung',
    en: 'Please confirm your newsletter subscription'
  };
  
  const content = language === 'de' ? `
    <h2>Willkommen beim CLYR Newsletter!</h2>
    <p>Bitte klicken Sie auf den folgenden Link, um Ihre Anmeldung zu bestätigen:</p>
    <p><a href="${confirmUrl}" style="background: #1a1a2e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Anmeldung bestätigen</a></p>
    <p>Wenn Sie sich nicht angemeldet haben, können Sie diese E-Mail ignorieren.</p>
  ` : `
    <h2>Welcome to the CLYR Newsletter!</h2>
    <p>Please click the following link to confirm your subscription:</p>
    <p><a href="${confirmUrl}" style="background: #1a1a2e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Confirm Subscription</a></p>
    <p>If you didn't sign up, you can ignore this email.</p>
  `;
  
  await sendEmail({
    to: email,
    subject: subjects[language] || subjects.de,
    html: content
  });
}

// Helper: Personalize email content
function personalizeContent(content, recipient) {
  return content
    .replace(/{{first_name}}/g, recipient.first_name || 'Kunde')
    .replace(/{{email}}/g, recipient.email);
}

export default {
  subscribe,
  confirmSubscription,
  unsubscribe,
  updatePreferences,
  getSubscribers,
  getStats,
  createCampaign,
  sendCampaign,
  getCampaigns
};