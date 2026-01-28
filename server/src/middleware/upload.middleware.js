import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const uploadDirs = ['documents', 'products', 'avatars', 'branding'];
uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '../../uploads', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = path.join(__dirname, '../../uploads');
    
    // Determine subfolder based on field name or route
    if (file.fieldname.includes('passport') || file.fieldname.includes('license') || file.fieldname.includes('bankCard')) {
      uploadPath = path.join(uploadPath, 'documents');
    } else if (file.fieldname.includes('product') || file.fieldname.includes('image')) {
      uploadPath = path.join(uploadPath, 'products');
    } else if (file.fieldname.includes('avatar')) {
      uploadPath = path.join(uploadPath, 'avatars');
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Dateityp ${file.mimetype} nicht erlaubt. Erlaubt: JPG, PNG, WebP, PDF`), false);
  }
};

// Multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10 // Max 10 files
  }
});

// Export upload middleware variants
export const uploadSingle = (fieldName) => upload.single(fieldName);

export const uploadMultiple = (fieldName, maxCount = 5) => upload.array(fieldName, maxCount);

export const uploadFields = (fields) => upload.fields(fields);

// Document upload for partner registration
export const uploadPartnerDocuments = upload.fields([
  { name: 'passport', maxCount: 1 },
  { name: 'bankCard', maxCount: 1 },
  { name: 'tradeLicense', maxCount: 1 }
]);

// Product images upload
export const uploadProductImages = upload.array('images', 10);

// Avatar upload
export const uploadAvatar = upload.single('avatar');

// Branding logo upload
const brandingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/branding');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `logo-${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});

const brandingFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Logo muss ein Bild sein (JPG, PNG, SVG, WebP)'), false);
  }
};

export const uploadBrandingLogo = multer({
  storage: brandingStorage,
  fileFilter: brandingFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB max for logo
  }
}).single('logo');

export default upload;