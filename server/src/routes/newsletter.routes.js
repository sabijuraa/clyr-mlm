/**
 * Newsletter Routes
 * Subscription management and email campaigns
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, isAdmin } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import * as newsletterService from '../services/newsletter.service.js';
import { query } from '../config/database.js';

// Multer setup for newsletter image uploads
const nlImgDir = 'uploads/newsletter/';
if (!fs.existsSync(nlImgDir)) fs.mkdirSync(nlImgDir, { recursive: true });
const imgUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, nlImgDir),
    filename: (req, file, cb) => cb(null, `nl-${Date.now()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 20 * 1024 * 1024 }
});

const router = express.Router();

// ============================================
// PUBLIC ROUTES
// ============================================

// Subscribe
router.post('/subscribe', asyncHandler(async (req, res) => {
  const { email, firstName, lastName, source, language, preferences } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'E-Mail ist erforderlich' });
  }
  
  const result = await newsletterService.subscribe(email, {
    firstName,
    lastName,
    source,
    language,
    preferences,
    ipAddress: req.ip
  });
  
  res.json(result);
}));

// Confirm subscription (double opt-in)
router.get('/confirm/:token', asyncHandler(async (req, res) => {
  try {
    await newsletterService.confirmSubscription(req.params.token);
    // Redirect to homepage with success message
    const frontendUrl = process.env.FRONTEND_URL || 'https://clyr.shop';
    res.redirect(`${frontendUrl}/?newsletter=confirmed`);
  } catch (e) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://clyr.shop';
    res.redirect(`${frontendUrl}/?newsletter=error`);
  }
}));

// Unsubscribe
router.post('/unsubscribe', asyncHandler(async (req, res) => {
  const { email, reason } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'E-Mail ist erforderlich' });
  }
  
  const result = await newsletterService.unsubscribe(email, reason);
  res.json(result);
}));

// Update preferences
router.put('/preferences', asyncHandler(async (req, res) => {
  const { email, preferences } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'E-Mail ist erforderlich' });
  }
  
  const result = await newsletterService.updatePreferences(email, preferences);
  res.json(result);
}));

// ============================================
// ADMIN ROUTES
// ============================================

// Get subscribers
router.get('/admin/subscribers', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { status, source, page, limit } = req.query;
  const result = await newsletterService.getSubscribers({ status, source, page, limit });
  res.json(result);
}));

// Get stats
router.get('/admin/stats', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const stats = await newsletterService.getStats();
  res.json(stats);
}));

// Manual confirm subscriber (admin)
router.post('/admin/confirm/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { query: dbQuery } = await import('../config/database.js');
  await dbQuery(
    "UPDATE newsletter_subscribers SET status = 'active', confirmed_at = NOW(), confirmation_token = NULL WHERE id = $1",
    [req.params.id]
  );
  res.json({ message: 'Subscriber bestaetigt' });
}));

// Delete subscriber (admin)
router.delete('/admin/subscribers/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { query: dbQuery } = await import('../config/database.js');
  await dbQuery('DELETE FROM newsletter_subscribers WHERE id = $1', [req.params.id]);
  res.json({ message: 'Subscriber geloescht' });
}));

// Create campaign
router.post('/admin/campaigns', authenticate, isAdmin, asyncHandler(async (req, res) => {
  console.log('[NEWSLETTER ROUTE] POST body keys:', Object.keys(req.body).join(', '));
  console.log('[NEWSLETTER ROUTE] html_content len:', (req.body.html_content||'').length);
  console.log('[NEWSLETTER ROUTE] text_content len:', (req.body.text_content||'').length);
  
  // Server-side: if html_content empty but text_content exists, build html NOW
  const body = { ...req.body };
  if ((!body.html_content || !body.html_content.trim()) && body.text_content && body.text_content.trim()) {
    body.html_content = body.text_content
      .split('\n')
      .map(p => p.trim() ? `<p style="font-size:15px;line-height:1.6;color:#333;margin:0 0 12px">${p}</p>` : '')
      .filter(Boolean)
      .join('');
    console.log('[NEWSLETTER ROUTE] Built html from text, length:', body.html_content.length);
  }
  
  const campaign = await newsletterService.createCampaign(body, req.user.id);
  console.log('[NEWSLETTER ROUTE] Campaign created id:', campaign.id, 'html_length:', (campaign.content_html||'').length);
  res.status(201).json(campaign);
}));

// Get campaigns
router.get('/admin/campaigns', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;
  const campaigns = await newsletterService.getCampaigns({ status, page, limit });
  res.json(campaigns);
}));

// Send campaign
router.post('/admin/campaigns/:id/send', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const result = await newsletterService.sendCampaign(req.params.id);
  res.json(result);
}));

// Update campaign content
router.put('/admin/campaigns/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { name, subject, content_html, html_content, content_text, text_content } = req.body;
  const html = content_html || html_content || '';
  const text = content_text || text_content || '';
  console.log('[NEWSLETTER UPDATE] id:', req.params.id, 'html_len:', html.length, 'text_len:', text.length);
  const result = await query(
    `UPDATE email_campaigns SET
      name = COALESCE($1, name),
      subject = COALESCE($2, subject),
      content_html = CASE WHEN $3 != '' THEN $3 ELSE content_html END,
      content_text = CASE WHEN $4 != '' THEN $4 ELSE content_text END,
      status = 'draft', updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [name||null, subject||null, html, text, req.params.id]
  );
  res.json(result.rows[0]);
}));

// Delete campaign
router.delete('/admin/campaigns/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  await query('DELETE FROM email_campaigns WHERE id = $1', [req.params.id]);
  res.json({ success: true });
}));

// Upload image for newsletter
router.post('/admin/upload-image', authenticate, isAdmin, imgUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'file', maxCount: 1 }]), asyncHandler(async (req, res) => {
  const uploaded = (req.files?.image && req.files.image[0]) || (req.files?.file && req.files.file[0]);
  if (!uploaded) return res.status(400).json({ error: 'No image uploaded' });
  const baseUrl = process.env.BACKEND_URL || process.env.FRONTEND_URL || 'https://clyr.shop';
  const url = `${baseUrl}/uploads/newsletter/${uploaded.filename}`;
  console.log('[NEWSLETTER] Image uploaded:', url);
  res.json({ url, imageUrl: url });
}));

// List image library (previously uploaded newsletter images)
router.get('/admin/image-library', authenticate, isAdmin, asyncHandler(async (req, res) => {
  try {
    if (!fs.existsSync(nlImgDir)) {
      return res.json({ images: [] });
    }
    const baseUrl = process.env.BACKEND_URL || process.env.FRONTEND_URL || 'https://clyr.shop';
    const files = fs.readdirSync(nlImgDir)
      .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
      .map(filename => {
        const stat = fs.statSync(path.join(nlImgDir, filename));
        return {
          filename,
          url: `${baseUrl}/uploads/newsletter/${filename}`,
          size: stat.size,
          uploadedAt: stat.mtime
        };
      })
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    res.json({ images: files });
  } catch (err) {
    console.error('Image library error:', err);
    res.json({ images: [] });
  }
}));

// Delete image from library
router.delete('/admin/image-library/:filename', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { filename } = req.params;
  // Security: only allow files matching expected pattern
  if (!/^nl-\d+\.\w+$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filepath = path.join(nlImgDir, filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
  res.json({ success: true });
}));

export default router;
