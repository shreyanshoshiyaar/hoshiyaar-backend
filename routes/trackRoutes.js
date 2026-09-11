import express from 'express';
import NotificationClick from '../models/NotificationClick.js';

const router = express.Router();

// POST /api/track/notification-click
router.post('/notification-click', async (req, res) => {
  try {
    const { type, userId } = req.body;

    const validTypes = ['daily_mass', 'inactivity_nudge', 'streak_risk', 'rank_drop', 'chapter_promo', 'manual_nudge', 'unknown'];
    const clickType = validTypes.includes(type) ? type : 'unknown';

    await NotificationClick.create({
      userId: userId || null,
      type: clickType,
      clickedAt: new Date(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking notification click:', error.message);
    res.json({ success: false });
  }
});

export default router;
