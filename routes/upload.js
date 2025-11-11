import express from 'express';
import { uploadMiddleware, uploadImage, uploadManyMiddleware, uploadImages, handleMulterError } from '../controllers/uploadController.js';

const router = express.Router();

// Wrapper to catch multer errors
const handleUpload = (middleware, handler) => {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      return handler(req, res, next);
    });
  };
};

router.post('/image', handleUpload(uploadMiddleware, uploadImage));
router.post('/images', handleUpload(uploadManyMiddleware, uploadImages));

export default router;


