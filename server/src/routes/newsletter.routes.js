/**
 * Newsletter Routes
 * Subscription management and email campaigns
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import newsletterService from '../services/newsletter.service.js';

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
  const result = await newsletterService.confirmSubscription(req.params.token);
  res.json(result);
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
router.get('/admin/subscribers', authenticate, authorize('admin', 'support'), asyncHandler(async (req, res) => {
  const { status, source, page, limit } = req.query;
  const result = await newsletterService.getSubscribers({ status, source, page, limit });
  res.json(result);
}));

// Get stats
router.get('/admin/stats', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const stats = await newsletterService.getStats();
  res.json(stats);
}));

// Create campaign
router.post('/admin/campaigns', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const campaign = await newsletterService.createCampaign(req.body, req.user.id);
  res.status(201).json(campaign);
}));

// Get campaigns
router.get('/admin/campaigns', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;
  const campaigns = await newsletterService.getCampaigns({ status, page, limit });
  res.json(campaigns);
}));

// Send campaign
router.post('/admin/campaigns/:id/send', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const result = await newsletterService.sendCampaign(req.params.id);
  res.json(result);
}));

export default router;
