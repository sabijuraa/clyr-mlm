import { Router } from 'express';
import * as partnerController from '../controllers/partner.controller.js';
import * as partnerSubController from '../controllers/partner-subscription.controller.js';
import { authenticate, requireRole, requireActivePartner } from '../middleware/auth.middleware.js';

const router = Router();

// PUBLIC routes (no auth) - Stripe partner fee
router.post('/fee-checkout', partnerSubController.createPartnerFeeCheckout);
router.get('/fee-success', partnerSubController.partnerFeeSuccess);

// All routes below require authentication
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

// Vouchers / Discount codes
router.get('/vouchers', partnerController.getVouchers);
router.post('/vouchers', partnerController.createVoucher);
router.delete('/vouchers/:id', partnerController.deleteVoucher);

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

// #37: Subscription (Intranet-Gebuehr)
router.get('/subscription', partnerSubController.getSubscriptionStatus);

// #54: Prospect protection
router.get('/prospects', partnerSubController.getMyProspects);
router.post('/prospects', partnerSubController.addProspect);

// #53: Crossline check
router.post('/check-crossline', partnerSubController.checkCrosslineAllowed);

// Admin: Record subscription payment
router.post('/admin/subscription-payment', requireRole('admin'), partnerSubController.recordSubscriptionPayment);

export default router;
