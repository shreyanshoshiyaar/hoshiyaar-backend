import express from 'express';
import { getBlogs, getBlogById, createBlog, updateBlog, deleteBlog, getAllBlogsAdmin } from '../controllers/blogController.js';

const router = express.Router();

// Public routes
router.get('/', getBlogs);
router.get('/:id', getBlogById);

// Admin routes 
router.get('/admin/all', getAllBlogsAdmin);
router.post('/', createBlog);
router.put('/:id', updateBlog);
router.delete('/:id', deleteBlog);

export default router;
