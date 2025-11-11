import express, { json } from 'express';
import { config } from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import lessonRoutes from './routes/lessonRoutes.js'; // 👈 ADD THIS LINE
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

// CORS configuration
const corsOptions = {
  origin: [
    'https://www.hoshiyaar.info', // <<< --- ADD THIS (Your primary production frontend)
    'https://hoshiyaar.info',
    'http://localhost:5173', // Vite dev server
    'http://localhost:3000', // Alternative dev port
    'http://192.168.1.11:3000', // Mobile access from local network
    'http://192.168.1.11:5173', // Mobile access for dev server
    'https://hoshiyaar-frontend-1.onrender.com', // Production frontend URL (if deployed)
    
    // Add your production frontend URL here when you deploy it
  ],
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

// Middleware
app.use(cors(corsOptions)); // Enable Cross-Origin Resource Sharing with specific options
app.use(json({ limit: '50mb' })); // Allow the server to accept JSON in the request body (increase limit)
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // For form data

// Define a simple route for the root URL
app.get('/', (req, res) => {
  res.send('API is running...');
});

// --- Mount Routers ---
// Use the auth routes for any requests to /api/auth
app.use('/api/auth', authRoutes);

// Use the lesson routes for any requests to /api/lessons
app.use('/api/lessons', lessonRoutes); // 👈 ADD THIS LINE

// Curriculum hierarchical routes
app.use('/api/curriculum', curriculumRoutes);


// Upload routes with extended timeout for large file uploads
app.use('/api/upload', (req, res, next) => {
  req.setTimeout(600000); // 10 minutes timeout for uploads
  res.setTimeout(600000);
  next();
}, uploadRoutes);

// Review routes
app.use('/api/review', reviewRoutes);
// Points routes
app.use('/api/points', pointsRoutes);


const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Backend accessible from mobile: http://192.168.1.11:${PORT}`);
});
// One-time index migration: drop deprecated unique index on subjects (boardId_1_name_1)
// and ensure the new compound index (boardId, classId, name). Safe to run on every boot.
(async () => {
  try {
    // Sync declared indexes (creates boardId_1_classId_1_name_1 if missing)
    await Subject.syncIndexes();
    // Attempt to drop the old index; ignore if it doesn't exist
    try { await Subject.collection.dropIndex('boardId_1_name_1'); } catch (e) { /* ignore */ }
    // Ensure class-level unique index and no legacy global index remains
    await ClassLevel.syncIndexes();

    // --- User index migration ---
    // Ensure the model's current indexes are applied (email should NOT be unique)
    await User.syncIndexes();
    // Drop any legacy unique index on email that may still exist in DB
    try { await User.collection.dropIndex('email_1'); } catch (e) { /* ignore if missing */ }
  } catch (e) {
    console.warn('Index migration for Subject failed:', e.message);
  }
})();
