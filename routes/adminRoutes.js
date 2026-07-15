import express from 'express';
import { adminLogin, getUsersAnalytics, updateUserSchool } from '../controllers/adminController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', adminLogin);

// Example of a protected admin route
router.get('/verify', protect, admin, (req, res) => {
  res.json({ status: 'Authorized', user: req.user });
});

router.get('/users-analytics', protect, admin, getUsersAnalytics);

router.put('/users/:id/school', protect, admin, updateUserSchool);

export default router;
