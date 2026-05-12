import Blog from '../models/Blog.js';

// Get all blogs
export const getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ published: true }).sort({ createdAt: -1 });
    res.status(200).json({ data: blogs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single blog
export const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    res.status(200).json({ data: blog });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Create blog
export const createBlog = async (req, res) => {
  try {
    const blog = new Blog(req.body);
    await blog.save();
    res.status(201).json({ data: blog });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Admin: Update blog
export const updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    res.status(200).json({ data: blog });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Admin: Delete blog
export const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    res.status(200).json({ message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Get all blogs (including unpublished)
export const getAllBlogsAdmin = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json({ data: blogs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
