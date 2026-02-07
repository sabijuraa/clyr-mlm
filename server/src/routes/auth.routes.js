import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validationRules, handleValidationErrors } from '../middleware/validation.middleware.js';
import { uploadPartnerDocuments } from '../middleware/upload.middleware.js';

const router = Router();

// Public routes

// Admin setup routes (for first-time setup)
router.get('/check-setup', authController.checkSetup);
router.post('/setup-admin', authController.setupAdmin);

router.post(
  '/login',
  validationRules.login,
  handleValidationErrors,
  authController.login
);

router.post(
  '/register',
  uploadPartnerDocuments,
  validationRules.register,
  handleValidationErrors,
  authController.register
);

router.post('/refresh-token', authController.refreshToken);

router.post('/forgot-password', authController.forgotPassword);

router.post('/reset-password', authController.resetPassword);

// Check if referral code exists
router.get('/check-referral/:code', authController.checkReferralCode);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);

router.post('/logout', authenticate, authController.logout);

router.put('/update-profile', authenticate, authController.updateProfile);

router.put('/change-password', authenticate, authController.changePassword);

export default router;
