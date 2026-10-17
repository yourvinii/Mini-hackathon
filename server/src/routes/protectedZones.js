const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { ProtectedZone } = require('../models');

// GET /api/protected-zones
router.get('/', async (req, res, next) => {
  try {
    const protectedZones = await ProtectedZone.find().sort({ createdAt: -1 }).lean();
    res.json({ protectedZones });
  } catch (error) {
    next(error);
  }
});

// POST /api/protected-zones
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Zone name is required'),
    body('category').isIn(['FOREST', 'WATERBODY', 'WILDLIFE', 'RESTRICTED_LAND', 'OTHER']).withMessage('Valid category required'),
    body('boundary').isObject().withMessage('Boundary GeoJSON Polygon is required'),
    body('boundary.type').equals('Polygon').withMessage('Boundary type must be Polygon'),
    body('boundary.coordinates').isArray({ min: 1 }).withMessage('Boundary coordinates required'),
    validate
  ],
  async (req, res, next) => {
    try {
      const { name, description, category, boundary, source = 'DEMO' } = req.body;
      const newZone = await ProtectedZone.create({
        name,
        description: description || '',
        category,
        boundary,
        source
      });

      res.status(201).json({ protectedZone: newZone });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
