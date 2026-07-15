import InteractiveStory from '../models/InteractiveStory.js';

// @desc    Get all stories (Admin)
// @route   GET /api/stories
// @access  Private/Admin
export const getAllStories = async (req, res) => {
  try {
    const stories = await InteractiveStory.find()
      .sort({ createdAt: -1 });
    res.json(stories);
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get story by board and subject (User Player)
// @route   GET /api/stories/:boardId/:subjectId
// @access  Public
export const getStory = async (req, res) => {
  try {
    const { boardId, classLevel } = req.params;
    const story = await InteractiveStory.findOne({ board: boardId, classLevel, isActive: true });
    
    if (!story) {
      return res.status(404).json({ error: 'Story not found for this class and board.' });
    }
    
    res.json(story);
  } catch (error) {
    console.error('Error fetching story:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Create or Update a story (Admin)
// @route   POST /api/stories
// @access  Private/Admin
export const createOrUpdateStory = async (req, res) => {
  try {
    const { _id, board, classLevel, backgroundImg, backgroundMusic, slides, isActive } = req.body;
    
    let story;
    
    if (_id) {
      // Update existing
      story = await InteractiveStory.findByIdAndUpdate(
        _id,
        { board, classLevel, backgroundImg, backgroundMusic, slides, isActive },
        { new: true, runValidators: true }
      );
    } else {
      // Check if one already exists for this board+class
      const existing = await InteractiveStory.findOne({ board, classLevel });
      if (existing) {
        // Update existing instead of throwing unique constraint error
        story = await InteractiveStory.findByIdAndUpdate(
          existing._id,
          { backgroundImg, backgroundMusic, slides, isActive },
          { new: true, runValidators: true }
        );
      } else {
        // Create new
        story = await InteractiveStory.create({
          board, classLevel, backgroundImg, backgroundMusic, slides, isActive
        });
      }
    }
    
    res.status(200).json(story);
  } catch (error) {
    console.error('Error saving story:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

// @desc    Delete a story
// @route   DELETE /api/stories/:id
// @access  Private/Admin
export const deleteStory = async (req, res) => {
  try {
    const { id } = req.params;
    await InteractiveStory.findByIdAndDelete(id);
    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
