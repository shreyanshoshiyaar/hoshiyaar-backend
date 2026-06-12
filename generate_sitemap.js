import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-backend-main/.env' });

import Blog from './models/Blog.js';
import Module from './models/Module.js';

const DOMAIN = 'https://hoshiyaar.info';

const generateSitemap = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB for sitemap generation');

    const blogs = await Blog.find({}, '_id updatedAt').lean();
    const modules = await Module.find({}, '_id').lean(); // Assuming module ID is used in routes

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static Routes
    const staticRoutes = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/about', priority: '0.8', changefreq: 'monthly' },
      { url: '/contact', priority: '0.8', changefreq: 'monthly' },
      { url: '/blogs', priority: '0.9', changefreq: 'daily' }
    ];

    staticRoutes.forEach(route => {
      sitemap += `  <url>\n    <loc>${DOMAIN}${route.url}</loc>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>\n`;
    });

    // Dynamic Blog Routes
    blogs.forEach(blog => {
      const lastMod = blog.updatedAt ? blog.updatedAt.toISOString() : new Date().toISOString();
      sitemap += `  <url>\n    <loc>${DOMAIN}/blogs/${blog._id}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    });

    // Dynamic "Chapter/Module" Routes
    modules.forEach(mod => {
      sitemap += `  <url>\n    <loc>${DOMAIN}/learn/module/${mod._id}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    });

    sitemap += `</urlset>`;

    const outputPath = 'd:/hoshiyaar/hoshiyaar/Hoshiyaar-frontend-main/public/sitemap.xml';
    fs.writeFileSync(outputPath, sitemap, 'utf8');
    
    console.log(`Sitemap generated successfully with ${staticRoutes.length + blogs.length + modules.length} URLs!`);
    console.log(`Saved to: ${outputPath}`);

  } catch (err) {
    console.error('Error generating sitemap:', err);
  } finally {
    process.exit(0);
  }
};

generateSitemap();
