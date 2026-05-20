import express from 'express';
import { adminLogin, getUsersAnalytics } from '../controllers/adminController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', adminLogin);

// Example of a protected admin route
router.get('/verify', protect, admin, (req, res) => {
  res.json({ status: 'Authorized', user: req.user });
});

router.get('/users-analytics', protect, admin, getUsersAnalytics);

export default router;
