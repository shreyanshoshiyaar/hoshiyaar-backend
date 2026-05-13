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
    if (!setting && key === 'homepage_slides') {
      setting = await SystemSettings.create({
        key: 'homepage_slides',
        value: [
          "https://res.cloudinary.com/dcxlzfyfp/image/upload/v1778578700/img-to-link/wunxaopn4qfirxnfdwa6.webp",
          "https://res.cloudinary.com/dcxlzfyfp/image/upload/v1778567489/img-to-link/n9fo2moxpmfwyp04ueob.webp",
          "https://res.cloudinary.com/dcxlzfyfp/image/upload/v1778567487/img-to-link/zy3aaizcfjl5qwm9ewjx.webp",
          "https://res.cloudinary.com/dcxlzfyfp/image/upload/v1778579285/img-to-link/eqdx0kyjrhkruh0ownxd.webp",
          "https://res.cloudinary.com/dcxlzfyfp/image/upload/v1778578699/img-to-link/tynaqnlzmbvoaafwu3do.webp"
        ],
        description: "List of 5 image URLs for the mobile homepage carousel"
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
