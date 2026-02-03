// server/src/middleware/upload.middleware.js
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import crypto from 'crypto';

// DigitalOcean Spaces configuration
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

// Memory storage for multer
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Multer upload config
export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter
});

// Upload to DigitalOcean Spaces
export const uploadToSpaces = async (file, folder = 'general') => {
  try {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${folder}/${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
    
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
    console.error('Upload to Spaces error:', error);
    throw new Error('Failed to upload file');
  }
};

// Middleware for multiple file uploads
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

// Middleware for single file upload
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

export default upload;