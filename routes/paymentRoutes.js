import express from 'express';
import {
  getPublicConfig,
  checkAccess,
  getUserStatus,
  createOrder,
  verifyPayment,
  mockSuccessPayment,
  cancelSubscription,
  reactivateSubscription
} from '../controllers/paymentController.js';
import {
  getPaymentSettings,
  updatePaymentSettings,
  savePlan,
  getTransactions,
  exportTransactionsCSV,
  getSubscriptions
} from '../controllers/adminPaymentController.js';
import { protect, admin, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public / Student endpoints
router.get('/config', getPublicConfig);
router.post('/check-access', protect, checkAccess);
router.get('/user-status', protect, getUserStatus);
router.post('/create-order', optionalAuth, createOrder);
router.post('/verify', optionalAuth, verifyPayment);
router.post('/verify-payment', optionalAuth, verifyPayment);
router.post('/mock-success', protect, mockSuccessPayment);
router.post('/cancel-subscription', protect, cancelSubscription);
router.post('/reactivate-subscription', protect, reactivateSubscription);

// Protected Admin endpoints
router.get('/admin/settings', protect, admin, getPaymentSettings);
router.put('/admin/settings', protect, admin, updatePaymentSettings);
router.post('/admin/plans', protect, admin, savePlan);
router.get('/admin/transactions', protect, admin, getTransactions);
router.get('/admin/transactions/export-csv', protect, admin, exportTransactionsCSV);
router.get('/admin/subscriptions', protect, admin, getSubscriptions);

export default router;
