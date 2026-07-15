import express from 'express';
import { 
  getAllStories, 
  getStory, 
  createOrUpdateStory, 
  deleteStory 
} from '../controllers/interactiveStoryController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route to fetch a story for the player
router.get('/:boardId/:classLevel', getStory);

// Admin routes
router.get('/', protect, admin, getAllStories);
router.post('/', protect, admin, createOrUpdateStory);
router.delete('/:id', protect, admin, deleteStory);

export default router;
