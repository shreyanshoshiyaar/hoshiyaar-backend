import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Blog from './models/Blog.js';

dotenv.config();

async function checkBlogSeo() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const blogs = await Blog.find({}).lean();
    
    console.log(`Found ${blogs.length} blogs.\n`);
    
    console.log("| Blog Slug | Meta Title | Meta Description |");
    console.log("|-----------|------------|------------------|");

    blogs.forEach(blog => {
      const title = blog.metaTitle || blog.seoTitle || blog.title;
      const description = blog.metaDescription || blog.seoDescription || blog.excerpt || `Learn about ${blog.title} with simple CBSE notes. Practice free MCQs on the Hoshiyaar app.`;
      
      console.log(`| ${blog.slug} | ${title.replace(/\|/g, '-')} | ${description.replace(/\|/g, '-').substring(0, 100)}... |`);
    });

    mongoose.disconnect();
  } catch (err) {
    console.error(err);
    mongoose.disconnect();
  }
}

checkBlogSeo();
