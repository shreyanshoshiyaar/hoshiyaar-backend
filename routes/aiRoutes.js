import express from 'express';
import { evaluateDescriptiveAnswer, handleFollowup, evaluateBatchAnswers } from '../controllers/aiController.js';
import { 
  getExamLimits, 
  getAiAnalytics, 
  updateExamAttemptConfig,
  getLatestExamSession,
  getUserExamHistory,
  saveExamSession
} from '../controllers/aiAnalyticsController.js';

const router = express.Router();

router.post('/evaluate', evaluateDescriptiveAnswer);
router.post('/evaluate-batch', evaluateBatchAnswers);
router.post('/followup', handleFollowup);

// Exam Limits & Analytics
router.get('/limits', getExamLimits);
router.get('/analytics', getAiAnalytics);
router.post('/config', updateExamAttemptConfig);

// Student Exam Review & History
router.get('/latest-session', getLatestExamSession);
router.get('/history', getUserExamHistory);
router.post('/save-session', saveExamSession);

export default router;
