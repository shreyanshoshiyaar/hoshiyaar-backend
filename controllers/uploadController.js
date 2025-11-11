import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

// Multer in-memory storage for simple uploads
// Set file size limits: 50MB per file, max 130 files
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB per file
}).single('file');
export const uploadManyMiddleware = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 130 } // 50MB per file, max 130 files
}).array('files', 130);

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }
    // Ensure Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(500).json({ message: 'Cloudinary not configured' });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: req.body.folder || 'hoshiyaar' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    return res.json({
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Upload failed', error: err.message });
  }
};

export const uploadImages = async (req, res) => {
  try {
    const files = req.files || [];
    if (files.length === 0) return res.status(400).json({ message: 'No files provided' });
    if (!process.env.CLOUDINARY_CLOUD_NAME) return res.status(500).json({ message: 'Cloudinary not configured' });

    const results = await Promise.all(files.map(f => new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: req.body.folder || 'hoshiyaar' },
        (error, result) => {
          if (error) return reject(error);
          resolve({ url: result.secure_url, public_id: result.public_id });
        }
      );
      stream.end(f.buffer);
    })));

    return res.json({ images: results });
  } catch (err) {
    return res.status(500).json({ message: 'Upload failed', error: err.message });
  }
};

// Error handler for multer file size limits
export const handleMulterError = (err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File too large. Maximum file size is 50MB per file.', code: 'LIMIT_FILE_SIZE' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({ message: 'Too many files. Maximum is 130 files at once.', code: 'LIMIT_FILE_COUNT' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Unexpected file field name.', code: 'LIMIT_UNEXPECTED_FILE' });
    }
  }
  next(err);
};


