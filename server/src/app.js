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

// Middleware
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: [clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
