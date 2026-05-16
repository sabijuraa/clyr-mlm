import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import * as brandingController from '../controllers/branding.controller.js';
import * as settingsController from '../controllers/settings.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { upload, uploadSingleToSpaces } from '../middleware/upload.middleware.js';

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
router.get('/partners/:id',          adminController.getPartnerById);
router.patch('/partners/:id/status', adminController.updatePartnerStatus);
router.patch('/partners/:id/rank',   adminController.updatePartnerRank);

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
router.post('/settings/branding/brochure',   upload.single('brochure'), uploadSingleToSpaces('branding'), brandingController.uploadBrochure);

// Settings — generic key/value (AFTER branding so /settings/branding is not caught here)
router.get('/settings',      adminController.getSettings);
router.put('/settings/:key', adminController.updateSetting);

// ── Company settings ──
router.get('/company', settingsController.getCompanySettings);
router.put('/company', settingsController.updateCompanySettings);

// Create admin account
router.post('/create-admin', adminController.createAdmin);

export default router;
