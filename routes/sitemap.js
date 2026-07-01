import express from 'express';
import Blog from '../models/Blog.js';
import Module from '../models/Module.js';

const router = express.Router();
const DOMAIN = 'https://hoshiyaar.info';

router.get('/', async (req, res) => {
  try {
    const blogs = await Blog.find({}, '_id category slug updatedAt').lean();
    const modules = await Module.find({}, '_id').lean(); // Assuming module ID is used in routes

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static Routes
    const staticRoutes = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/about', priority: '0.8', changefreq: 'monthly' },
      { url: '/contact', priority: '0.8', changefreq: 'monthly' },
      { url: '/blogs', priority: '0.9', changefreq: 'daily' },
      { url: '/privacy-policy', priority: '0.5', changefreq: 'monthly' },
      { url: '/terms-conditions', priority: '0.5', changefreq: 'monthly' },
      { url: '/disclaimer', priority: '0.5', changefreq: 'monthly' },
      { url: '/login', priority: '0.7', changefreq: 'monthly' },
      { url: '/signup', priority: '0.7', changefreq: 'monthly' }
    ];

    staticRoutes.forEach(route => {
      sitemap += `  <url>\n    <loc>${DOMAIN}${route.url}</loc>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>\n`;
    });

    // Dynamic Blog Routes
    blogs.forEach(blog => {
      const lastMod = blog.updatedAt ? blog.updatedAt.toISOString() : new Date().toISOString();
      const blogUrl = blog.slug 
        ? `${DOMAIN}/blogs/${blog.category || 'general'}/${blog.slug}` 
        : `${DOMAIN}/blogs/${blog._id}`;
      sitemap += `  <url>\n    <loc>${blogUrl}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    });

    // Dynamic "Chapter/Module" Routes
    modules.forEach(mod => {
      sitemap += `  <url>\n    <loc>${DOMAIN}/learn/module/${mod._id}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    });

    sitemap += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).end();
  }
});

export default router;
