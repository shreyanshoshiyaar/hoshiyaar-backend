import express from 'express';
import { evaluateDescriptiveAnswer, handleFollowup, evaluateBatchAnswers } from '../controllers/aiController.js';

const router = express.Router();

router.post('/evaluate', evaluateDescriptiveAnswer);
router.post('/evaluate-batch', evaluateBatchAnswers);
router.post('/followup', handleFollowup);

export default router;
