import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import * as brandingController from '../controllers/branding.controller.js';
import * as settingsController from '../controllers/settings.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { upload, uploadDocuments, uploadSingleToSpaces } from '../middleware/upload.middleware.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('admin'));

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Customers
router.get('/customers', adminController.getAllCustomers);
router.get('/customers/:id', adminController.getCustomerDetails);

// Partners management
router.get('/partners',              adminController.getPartners);
// Sponsor/upline candidates for the "Change Sponsor" dropdown. Includes
// admin accounts (e.g. theresa@clyr.at) that are also real affiliates,
// which getPartners() intentionally excludes from the main partner table.
router.get('/sponsor-candidates',    adminController.getSponsorCandidates);
router.get('/partners/:id',          adminController.getPartnerById);
router.patch('/partners/:id/status', adminController.updatePartnerStatus);
router.patch('/partners/:id/rank',   adminController.updatePartnerRank);
// Move a partner under a different sponsor/upline (downline reassignment).
// The controller already existed with cycle-detection logic, but this route
// was never registered, so the admin UI's "Sponsor ändern" control 404'd.
router.post('/change-sponsor',       adminController.changeSponsor);

// Full MLM Tree (admin only, shows all partners from root)
router.get('/full-tree', adminController.getFullTree);

// Invoices
router.get('/invoices',     adminController.getInvoices);
router.post('/invoices/generate-missing', adminController.generateMissingInvoices);
router.get('/fee-payments', adminController.getFeePayments);
router.get('/fee-payments/:id/invoice', adminController.getFeePaymentInvoice);

// Ranks & commissions management
router.get('/ranks', adminController.getRanks);
router.patch('/ranks/:id', adminController.updateRank);
router.patch('/my-rank', adminController.updateOwnRank);

// ── Branding MUST come BEFORE /settings/:key — otherwise Express matches key='branding' ──
router.get('/settings/branding',             brandingController.getBranding);
router.put('/settings/branding',             brandingController.updateBranding);
router.post('/settings/branding/logo',       upload.single('logo'),     uploadSingleToSpaces('branding'), brandingController.uploadLogoLight);
router.post('/settings/branding/logo-light', upload.single('logo'),     uploadSingleToSpaces('branding'), brandingController.uploadLogoLight);
router.post('/settings/branding/logo-dark',  upload.single('logo'),     uploadSingleToSpaces('branding'), brandingController.uploadLogoDark);
router.post('/settings/branding/favicon',    upload.single('favicon'),  uploadSingleToSpaces('branding'), brandingController.uploadFavicon);
router.post('/settings/branding/brochure',   uploadDocuments.single('brochure'), uploadSingleToSpaces('branding'), brandingController.uploadBrochure);

// Settings — generic key/value (AFTER branding so /settings/branding is not caught here)
router.get('/settings',      adminController.getSettings);
router.put('/settings/:key', adminController.updateSetting);

// ── Company settings ──
router.get('/company', settingsController.getCompanySettings);
router.put('/company', settingsController.updateCompanySettings);

// Create admin account
router.post('/create-admin', adminController.createAdmin);

// One-time historical data fix (safe to run multiple times)
router.post('/fix-historical-commissions', adminController.fixHistoricalCommissions);

export default router;
