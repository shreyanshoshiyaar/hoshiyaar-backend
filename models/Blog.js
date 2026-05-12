import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true }, // HTML content
  excerpt: { type: String },
  author: { type: String, default: 'Admin' },
  image: { type: String }, // Cloudinary URL
  tags: [{ type: String }],
  published: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Blog', blogSchema);
