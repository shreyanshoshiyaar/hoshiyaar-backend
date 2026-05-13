import express from 'express';
import SystemSettings from '../models/SystemSettings.js';

const router = express.Router();

// GET all settings
router.get('/', async (req, res) => {
  try {
    const settings = await SystemSettings.find();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET a specific setting by key
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    let setting = await SystemSettings.findOne({ key });
    // If not found, create a default one for known keys
    if (!setting && key === 'mission_video_url') {
      setting = await SystemSettings.create({
        key: 'mission_video_url',
        value: 'https://www.youtube.com/embed/uHDSRZK74Dk',
        description: "URL for the 'Today's Mission' video on the homescreen"
      });
    }
    return res.json(setting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE or CREATE a setting
router.post('/', async (req, res) => {
  try {
    const { key, value, description } = req.body;
    const setting = await SystemSettings.findOneAndUpdate(
      { key },
      { value, description },
      { new: true, upsert: true }
    );
    res.json(setting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
