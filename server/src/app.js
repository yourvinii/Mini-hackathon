const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const dashboardRoutes = require('./routes/dashboard');
const areasRoutes = require('./routes/areas');
const scenesRoutes = require('./routes/scenes');
const analysesRoutes = require('./routes/analyses');
const protectedZonesRoutes = require('./routes/protectedZones');
const inspectionsRoutes = require('./routes/inspections');

const app = express();

// Remove fingerprinting header
app.disable('x-powered-by');

// Middleware
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = [clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Static assets (for local imagery, thumbnails, demo masks)
app.use('/assets', express.static(path.join(__dirname, '../public/assets')));

// Mount API routes
app.use('/api', dashboardRoutes);
app.use('/api/areas', areasRoutes);
app.use('/api/scenes', scenesRoutes);
app.use('/api/analyses', analysesRoutes);
app.use('/api/protected-zones', protectedZonesRoutes);
app.use('/api/inspections', inspectionsRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Cannot ${req.method} ${req.originalUrl}`,
      code: 'NOT_FOUND'
    }
  });
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;
