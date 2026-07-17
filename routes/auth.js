import express from 'express';
// Corrected the import to use named imports directly
import { registerUser, registerGuest, loginUser, updateOnboarding, getUser, getProgress, updateProgress, checkUsername, verifyStorage, getModuleProgress, getCompletedModules, deleteUser, sendOtp, verifyOtp, resetPassword, updateActivity } from '../controllers/authController.js';

const router = express.Router();

import User from '../models/User.js';

// Root route for auth API health check
router.get('/', (req, res) => {
  res.json({ status: 'Auth API is running' });
});

router.get('/temp-token-count', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const usersWithTokens = await User.countDocuments({ fcmToken: { $ne: null } });
    res.json({ totalUsers, usersWithTokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for WhatsApp OTP sending
router.post('/send-otp', sendOtp);

// Route for WhatsApp OTP verification
router.post('/verify-otp', verifyOtp);

// Route for password reset
router.post('/reset-password', resetPassword);

// Route to update user activity and FCM token
router.post('/update-activity', updateActivity);

// Route for user registration
router.post('/register', registerUser);

// Route for anonymous guest registration
router.post('/register-guest', registerGuest);

// Route for user login
router.post('/login', loginUser);

// Route to update onboarding selections
router.put('/onboarding', updateOnboarding);

// Route to get user data
router.get('/user/:userId', getUser);

// Route to delete user account
router.delete('/user/:userId', deleteUser);

// Username availability
router.get('/check-username', checkUsername);

// Progress routes
router.get('/progress/:userId', getProgress);
router.get('/module-progress/:userId', getModuleProgress);
router.put('/progress', updateProgress);
// Completed module ids (with cache)
router.get('/completed-modules/:userId', getCompletedModules);

// Debug route to verify database storage
router.get('/verify-storage/:userId', verifyStorage);

export default router;

