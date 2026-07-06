import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import Blog from './models/Blog.js';

async function updateSitemap() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to DB');

    const blogs = await Blog.find({ published: true });
    console.log(`Found ${blogs.length} published blogs.`);

    const sitemapPath = path.resolve(__dirname, '../Hoshiyaar-frontend-main/public/sitemap.xml');
    
    let sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');

    let newUrls = '';
    
    blogs.forEach(blog => {
      // Create url entry
      const category = blog.category ? blog.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'general';
      const url = `https://hoshiyaar.info/blogs/${category}/${blog.slug}`;
      
      // Check if URL already exists in sitemap to prevent duplicates
      if (!sitemapContent.includes(url)) {
        newUrls += `
<url>
<loc>${url}</loc>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>`;
      }
    });

    if (newUrls) {
      // Insert before the closing </urlset> tag
      sitemapContent = sitemapContent.replace('</urlset>', `${newUrls}\n</urlset>`);
      fs.writeFileSync(sitemapPath, sitemapContent);
      console.log('Sitemap successfully updated with new blog URLs!');
    } else {
      console.log('No new blog URLs to add. Sitemap is already up to date.');
    }

  } catch (error) {
    console.error('Error updating sitemap:', error);
  } finally {
    mongoose.connection.close();
  }
}

updateSitemap();
