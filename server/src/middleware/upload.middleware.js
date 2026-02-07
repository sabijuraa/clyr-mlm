// server/src/middleware/upload.middleware.js
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import crypto from 'crypto';

// ========================================
// DIGITALOCEAN SPACES CONFIGURATION
// ========================================

const spacesClient = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT || 'https://fra1.digitaloceanspaces.com',
  region: process.env.DO_SPACES_REGION || 'fra1',
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET
  }
});

const BUCKET_NAME = process.env.DO_SPACES_BUCKET || 'clyr-uploads';
const CDN_URL = process.env.DO_SPACES_CDN || `https://${BUCKET_NAME}.fra1.cdn.digitaloceanspaces.com`;

// ========================================
// MULTER CONFIGURATION
// ========================================

// Memory storage for multer
const storage = multer.memoryStorage();

// File filter for images
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// File filter for documents (PDFs, images)
const documentFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  
  if (extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only documents and images are allowed!'));
  }
};

// ========================================
// MULTER UPLOADS
// ========================================

// Image upload (for products, branding, etc.)
export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFileFilter
});

// Document upload (for partner documents, contracts, etc.)
export const uploadDocuments = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: documentFileFilter
});

// ========================================
// UPLOAD TO SPACES HELPER
// ========================================

export const uploadToSpaces = async (file, folder = 'general') => {
  try {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${folder}/${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
    
    // If DO Spaces keys are not configured, save locally
    if (!process.env.DO_SPACES_KEY || !process.env.DO_SPACES_SECRET) {
      const { writeFileSync, mkdirSync, existsSync } = await import('fs');
      const localDir = `public/uploads/${folder}`;
      if (!existsSync(localDir)) mkdirSync(localDir, { recursive: true });
      const localPath = `${localDir}/${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
      writeFileSync(localPath, file.buffer);
      const fileUrl = `/${localPath}`;
      return fileUrl;
    }

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ACL: 'public-read',
      ContentType: file.mimetype,
      CacheControl: 'max-age=31536000'
    };

    await spacesClient.send(new PutObjectCommand(uploadParams));
    
    const fileUrl = `${CDN_URL}/${fileName}`;
    return fileUrl;
  } catch (error) {
    console.error('Upload error:', error);
    // Final fallback: save locally
    try {
      const { writeFileSync, mkdirSync, existsSync } = await import('fs');
      const fileExtension = path.extname(file.originalname);
      const localDir = `public/uploads/${folder}`;
      if (!existsSync(localDir)) mkdirSync(localDir, { recursive: true });
      const localPath = `${localDir}/${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
      writeFileSync(localPath, file.buffer);
      return `/${localPath}`;
    } catch (e2) {
      console.error('Local fallback also failed:', e2);
      throw new Error('Failed to upload file');
    }
  }
};

// ========================================
// MIDDLEWARE FOR MULTIPLE FILE UPLOADS
// ========================================

export const uploadMultipleToSpaces = (folder) => {
  return async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return next();
      }

      const uploadPromises = req.files.map(file => uploadToSpaces(file, folder));
      const uploadedUrls = await Promise.all(uploadPromises);
      
      req.uploadedFiles = uploadedUrls;
      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
};

// ========================================
// MIDDLEWARE FOR SINGLE FILE UPLOAD
// ========================================

export const uploadSingleToSpaces = (folder) => {
  return async (req, res, next) => {
    try {
      if (!req.file) {
        return next();
      }

      const fileUrl = await uploadToSpaces(req.file, folder);
      req.uploadedFile = fileUrl;
      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
};

// ========================================
// LEGACY/COMPATIBILITY EXPORTS
// ========================================

// For auth.routes.js - Partner document uploads
export const uploadPartnerDocuments = [
  uploadDocuments.fields([
    { name: 'id_document', maxCount: 1 },
    { name: 'business_license', maxCount: 1 },
    { name: 'tax_certificate', maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      const uploadedDocs = {};

      if (req.files) {
        // Upload each document type if present
        for (const [fieldName, files] of Object.entries(req.files)) {
          if (files && files.length > 0) {
            const fileUrl = await uploadToSpaces(files[0], 'partners/documents');
            uploadedDocs[fieldName] = fileUrl;
          }
        }
      }

      req.uploadedDocuments = uploadedDocs;
      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

// For admin.routes.js - Branding logo uploads
export const uploadBrandingLogo = [
  upload.single('logo'),
  uploadSingleToSpaces('branding')
];

// Single file upload middleware (general)
export const uploadSingle = (fieldName, folder = 'general') => {
  return [
    upload.single(fieldName),
    uploadSingleToSpaces(folder)
  ];
};

// Multiple files upload middleware (general)
export const uploadMultiple = (fieldName, maxCount = 5, folder = 'general') => {
  return [
    upload.array(fieldName, maxCount),
    uploadMultipleToSpaces(folder)
  ];
};

// ========================================
// DEFAULT EXPORT
// ========================================

export default upload;