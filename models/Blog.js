import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true, sparse: true },
  category: { type: String, default: 'general' },
  content: { type: String, required: true }, // HTML content
  excerpt: { type: String },
  metaTitle: { type: String },
  metaDescription: { type: String },
  author: { type: String, default: 'Admin' },
  image: { type: String }, // Cloudinary URL
  tags: [{ type: String }],
  published: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Blog', blogSchema);
