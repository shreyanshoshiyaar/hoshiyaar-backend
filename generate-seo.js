import mongoose from 'mongoose';
import { config } from 'dotenv';
import Blog from './models/Blog.js';

config();

function generateSEO(blogTitle, category) {
  // Try to extract class number from title or category
  let classNum = '6, 7 & 8';
  if (blogTitle.includes('Class 6') || category.includes('6')) classNum = '6';
  else if (blogTitle.includes('Class 7') || category.includes('7')) classNum = '7';
  else if (blogTitle.includes('Class 8') || category.includes('8')) classNum = '8';

  // Try to extract the topic by removing "Class X" and common words
  let topic = blogTitle
    .replace(/Class \d/gi, '')
    .replace(/what is/gi, '')
    .replace(/easy explanation/gi, '')
    .replace(/cbse/gi, '')
    .replace(/notes/gi, '')
    .replace(/and/gi, '&')
    .replace(/-/g, '')
    .trim();

  // Clean up extra spaces
  topic = topic.replace(/\s+/g, ' ');

  if (!topic || topic.length < 3) {
    topic = blogTitle.substring(0, 30);
  }

  // Capitalize first letter of each word
  topic = topic.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const metaTitle = `${topic} Class ${classNum} – CBSE Notes & MCQs`.substring(0, 60);
  const metaDescription = `Learn CBSE Class ${classNum} Science with simple notes on ${topic}. Practice free MCQs on the Hoshiyaar app.`.substring(0, 155);

  return { metaTitle, metaDescription };
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to Database.');

    const blogs = await Blog.find({});
    console.log(`Found ${blogs.length} blogs.`);

    for (let blog of blogs) {
      console.log(`Generating SEO for: "${blog.title}"...`);
      const seoData = generateSEO(blog.title, blog.category || '');

      blog.metaTitle = seoData.metaTitle;
      blog.metaDescription = seoData.metaDescription;
      await blog.save();
      
      console.log(`✅ Updated!`);
      console.log(`Title: ${seoData.metaTitle}`);
      console.log(`Desc:  ${seoData.metaDescription}\n`);
    }

    console.log('Finished updating all blogs!');
    process.exit(0);
  } catch (err) {
    console.error('Script failed:', err);
    process.exit(1);
  }
}

run();
