import mongoose from 'mongoose';

const notificationClickSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: ['daily_mass', 'inactivity_nudge', 'streak_risk', 'rank_drop', 'chapter_promo', 'manual_nudge', 'unknown'],
      default: 'unknown',
      index: true,
    },
    clickedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Compound index for efficient day-wise + type aggregation
notificationClickSchema.index({ clickedAt: -1, type: 1 });

const NotificationClick = mongoose.model('NotificationClick', notificationClickSchema);

export default NotificationClick;
