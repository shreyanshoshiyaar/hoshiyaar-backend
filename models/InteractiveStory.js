import mongoose from 'mongoose';

const { Schema } = mongoose;

const SlideOptionSchema = new Schema({
  label: { type: String, required: true },
  nextSlideIndex: { type: Number, required: true, default: -1 }, // -1 means end of story
  isWrong: { type: Boolean, default: false }
});

const SlideSchema = new Schema({
  characterImg: { type: String, default: '' },
  dialogue: { type: String, required: true },
  audioUrl: { type: String, default: '' },
  buttons: [SlideOptionSchema]
});

const InteractiveStorySchema = new Schema({
  board: { type: String, required: true },
  classLevel: { type: String, required: true },
  backgroundImg: { type: String, default: '' },
  backgroundMusic: { type: String, default: '' },
  targetSubject: { type: String, default: '' },
  targetChapterId: { type: String, default: '' },
  slides: [SlideSchema],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// A board + classLevel can only have one active story
InteractiveStorySchema.index({ board: 1, classLevel: 1 }, { unique: true });

export default mongoose.model('InteractiveStory', InteractiveStorySchema);
