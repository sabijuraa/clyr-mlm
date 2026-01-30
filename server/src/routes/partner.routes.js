import { Router } from 'express';
import * as partnerController from '../controllers/partner.controller.js';
import { authenticate, requireRole, requireActivePartner } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Partner dashboard stats
router.get('/dashboard', partnerController.getDashboardStats);

// Team management
router.get('/team', partnerController.getTeam);
router.get('/team/tree', partnerController.getTeamTree);
router.get('/team/:id', partnerController.getTeamMemberDetails);

// Referral links
router.get('/referral-links', partnerController.getReferralLinks);
router.post('/referral-links', partnerController.createReferralLink);
router.get('/referral-stats', partnerController.getReferralStats);

// Customers
router.get('/customers', partnerController.getCustomers);

// Wallet & Payouts
router.get('/wallet', partnerController.getWallet);
router.post('/payout-request', requireActivePartner, partnerController.requestPayout);
router.get('/payouts', partnerController.getPayoutHistory);

// Rank progress
router.get('/rank-progress', partnerController.getRankProgress);

// Activity
router.get('/activity', partnerController.getActivity);

export default router;
