import express, { json } from 'express';
import { config } from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import lessonRoutes from './routes/lessonRoutes.js';
import curriculumRoutes from './routes/curriculum.js';
import { v2 as cloudinary } from 'cloudinary';
import uploadRoutes from './routes/upload.js';
import reviewRoutes from './routes/review.js';
import pointsRoutes from './routes/points.js';
import Subject from './models/Subject.js';
import ClassLevel from './models/ClassLevel.js';
import User from './models/User.js';

// Load environment variables from .env file
config();

// Configure Cloudinary if env vars are present
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Connect to the database
connectDB();

const app = express();

// ============================================
// CORS CONFIGURATION - UPDATED WITH VERCEL
// ============================================
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      // Primary Production Domain
      'https://hoshiyaar.info',
      'https://www.hoshiyaar.info',

      // Legacy/Alternative Domains
      'https://hoshiyaar-frontend.vercel.app',
      'https://hoshiyaar-frontend-1.onrender.com',
      'http://localhost',        // Required for Capacitor Android (HTTP)
      'https://localhost',       // Required for Capacitor Android (HTTPS)
      'capacitor://localhost',  // Required for Capacitor iOS
      'https://api.hoshiyaar.info', // Backend its own domain

      // Local development
      'http://localhost:5173',
      'http://localhost:3000',
      'http://192.168.1.11:3000',
      'http://192.168.1.11:5173',

      // Environment variable (for flexibility)
      process.env.FRONTEND_URL
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    // Allow ALL Vercel preview deployments (*.vercel.app)
    if (origin.includes('vercel.app')) {
      return callback(null, true);
    }

    // Allow defined origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Log blocked origins for debugging
    console.error(`❌ CORS blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging (helpful for debugging)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.get('origin') || 'none'}`);
  next();
});

// Define a simple route for the root URL
app.get('/', (req, res) => {
  res.json({
    message: 'Hoshiyaar API is running...',
    status: 'OK',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// --- Mount Routers ---
app.use('/api/auth', authRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/curriculum', curriculumRoutes);

// Upload routes with extended timeout for large file uploads
app.use('/api/upload', (req, res, next) => {
  req.setTimeout(600000);
  res.setTimeout(600000);
  next();
}, uploadRoutes);

// Review routes
app.use('/api/review', reviewRoutes);

// Points routes
app.use('/api/points', pointsRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed',
      origin: req.get('origin')
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS: Allowing all *.vercel.app domains`);
  console.log(`🔗 Backend accessible from mobile: http://192.168.1.11:${PORT}`);
  console.log('='.repeat(50));
});

// One-time index migration
(async () => {
  try {
    await Subject.syncIndexes();
    try { await Subject.collection.dropIndex('boardId_1_name_1'); } catch (e) { /* ignore */ }
    await ClassLevel.syncIndexes();
    await User.syncIndexes();
    try { await User.collection.dropIndex('email_1'); } catch (e) { /* ignore if missing */ }
  } catch (e) {
    console.warn('Index migration failed:', e.message);
  }
})();