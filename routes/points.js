import express from 'express';
import { awardPoints, getSummary, backfillTotals } from '../controllers/pointsController.js';

const router = express.Router();

// Award points for a question attempt (idempotent)
router.put('/award', awardPoints);

// Get points summary for dashboard
router.get('/summary', getSummary);

// Admin backfill
router.post('/backfill', backfillTotals);

export default router;


