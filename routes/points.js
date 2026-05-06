import express from 'express';
import { awardPoints, getSummary, backfillTotals, getLeaderboard, getSchools, revertSessionPoints } from '../controllers/pointsController.js';

const router = express.Router();

// Award points for a question attempt (idempotent)
router.put('/award', awardPoints);

// Revert points earned in a session
router.post('/revert', revertSessionPoints);

// Get points summary for dashboard
router.get('/summary', getSummary);

// Get leaderboard for a school
router.get('/leaderboard', getLeaderboard);

// Get unique schools list
router.get('/schools', getSchools);

// Admin backfill
router.post('/backfill', backfillTotals);

export default router;


