import express from 'express';
import { adminLogin, getUsersAnalytics, updateUserSchool, getSessionsAnalytics, exportSessionsCSV, exportUsersCSV, getNotificationAnalytics } from '../controllers/adminController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', adminLogin);

// Example of a protected admin route
router.get('/verify', protect, admin, (req, res) => {
  res.json({ status: 'Authorized', user: req.user });
});

router.get('/users-analytics', protect, admin, getUsersAnalytics);
router.get('/users/export-csv', protect, admin, exportUsersCSV);
router.get('/sessions', protect, admin, getSessionsAnalytics);
router.get('/sessions/export-csv', protect, admin, exportSessionsCSV);

router.put('/users/:id/school', protect, admin, updateUserSchool);

router.get('/notification-analytics', protect, admin, getNotificationAnalytics);

export default router;
