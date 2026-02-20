/**
 * Newsletter Routes
 * Subscription management and email campaigns
 */

import express from 'express';
import { authenticate, isAdmin } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import * as newsletterService from '../services/newsletter.service.js';

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
  const campaign = await newsletterService.createCampaign(req.body, req.user.id);
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

export default router;
