import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import * as cmsController from '../controllers/cms.controller.js';

const router = express.Router();

// Configure multer for CMS uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/cms/';
    import('fs').then(fs => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    });
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Nur Bilder erlaubt'));
  }
});

// Public routes
router.get('/homepage', cmsController.getHomepageContent);
router.get('/section/:section', cmsController.getContentBySection);

// Admin routes
router.get('/', authenticate, requireRole('admin'), cmsController.getAllContent);
router.get('/:id', authenticate, requireRole('admin'), cmsController.getContentById);
router.post('/', authenticate, requireRole('admin'), cmsController.createContent);
router.put('/:id', authenticate, requireRole('admin'), cmsController.updateContent);
router.delete('/:id', authenticate, requireRole('admin'), cmsController.deleteContent);
router.put('/bulk/update', authenticate, requireRole('admin'), cmsController.bulkUpdateContent);
router.post('/upload', authenticate, requireRole('admin'), upload.single('image'), cmsController.uploadImage);

export default router;
