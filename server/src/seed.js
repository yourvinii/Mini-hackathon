require('dotenv').config();
const mongoose = require('mongoose');
const {
  MonitoringArea,
  SatelliteScene,
  ChangeAnalysis,
  ProtectedZone,
  InspectionTask
} = require('./models');

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/landwatch';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB');

    // Clean existing collections
    await Promise.all([
      MonitoringArea.deleteMany({}),
      SatelliteScene.deleteMany({}),
      ChangeAnalysis.deleteMany({}),
      ProtectedZone.deleteMany({}),
      InspectionTask.deleteMany({})
    ]);
    console.log('[Seed] Cleared existing collections');

    // 1. Create Three Demonstration Monitoring Areas
    const areas = await MonitoringArea.create([
      {
        name: 'Western Ghats Ecological Corridor - Sector 4',
        description: 'Demonstration Zone A: Tropical wet evergreen rainforest & buffer ridge with high biodiversity sensitivity.',
        region: 'Karnataka / Kerala Buffer Zone',
        status: 'ACTIVE',
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [75.65, 12.45],
              [75.75, 12.45],
              [75.75, 12.55],
              [75.65, 12.55],
              [75.65, 12.45]
            ]
          ]
        },
        centroid: {
          type: 'Point',
          coordinates: [75.70, 12.50]
        }
      },
      {
        name: 'Lake Pulicat Wetland Reserve - North Basin',
        description: 'Demonstration Zone B: Brackish lagoon ecosystem prone to seasonal shrinkage and aquaculture expansion.',
        region: 'Andhra Pradesh Coastal Buffer',
        status: 'ACTIVE',
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [80.15, 13.50],
              [80.25, 13.50],
              [80.25, 13.60],
              [80.15, 13.60],
              [80.15, 13.50]
            ]
          ]
        },
        centroid: {
          type: 'Point',
          coordinates: [80.20, 13.55]
        }
      },
      {
        name: 'Aravalli Ridge Protected Foothills - Zone B',
        description: 'Demonstration Zone C: Semi-arid relict mountain range vulnerable to unauthorized quarrying and built-up encroachment.',
        region: 'Haryana / NCR Green Belt',
        status: 'ACTIVE',
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [77.00, 28.30],
              [77.10, 28.30],
              [77.10, 28.40],
              [77.00, 28.40],
              [77.00, 28.30]
            ]
          ]
        },
        centroid: {
          type: 'Point',
          coordinates: [77.05, 28.35]
        }
      }
    ]);
    console.log(`[Seed] Created ${areas.length} monitoring areas`);

    // 2. Create Two Protected Zones
    const protectedZones = await ProtectedZone.create([
      {
        name: 'Shola Forest Nature Reserve',
        description: 'Gazetted core wildlife sanctuary and montane shola-grassland complex. Zero development permitted.',
        category: 'FOREST',
        source: 'DEMO',
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [75.68, 12.47],
              [75.74, 12.47],
              [75.74, 12.53],
              [75.68, 12.53],
              [75.68, 12.47]
            ]
          ]
        }
      },
      {
        name: 'Pulicat Bird Sanctuary Core Zone',
        description: 'Ramsar protected wetland supporting migratory flamingos and pelicans.',
        category: 'WILDLIFE',
        source: 'DEMO',
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [80.17, 13.52],
              [80.23, 13.52],
              [80.23, 13.58],
              [80.17, 13.58],
              [80.17, 13.52]
            ]
          ]
        }
      }
    ]);
    console.log(`[Seed] Created ${protectedZones.length} protected zones`);

    // 3. Create Satellite Scenes for Western Ghats (Area 0) and Pulicat (Area 1)
    const scenes = await SatelliteScene.create([
      {
        monitoringArea: areas[0]._id,
        acquisitionDate: new Date('2023-03-15T00:00:00.000Z'),
        source: 'SENTINEL_2',
        imageUrl: 'http://localhost:5000/assets/scenes/wg_2023.svg',
        thumbnailUrl: 'http://localhost:5000/assets/scenes/wg_2023.svg',
        cloudCoverPercent: 2.1,
        resolutionMeters: 10,
        bounds: areas[0].boundary,
        processingStatus: 'READY'
      },
      {
        monitoringArea: areas[0]._id,
        acquisitionDate: new Date('2023-10-12T00:00:00.000Z'),
        source: 'SENTINEL_2',
        imageUrl: 'http://localhost:5000/assets/scenes/wg_2023.svg',
        thumbnailUrl: 'http://localhost:5000/assets/scenes/wg_2023.svg',
        cloudCoverPercent: 1.8,
        resolutionMeters: 10,
        bounds: areas[0].boundary,
        processingStatus: 'READY'
      },
      {
        monitoringArea: areas[0]._id,
        acquisitionDate: new Date('2024-03-20T00:00:00.000Z'),
        source: 'PREPARED_DEMO',
        imageUrl: 'http://localhost:5000/assets/scenes/wg_2024.svg',
        thumbnailUrl: 'http://localhost:5000/assets/scenes/wg_2024.svg',
        cloudCoverPercent: 3.4,
        resolutionMeters: 10,
        bounds: areas[0].boundary,
        processingStatus: 'READY'
      },
      {
        monitoringArea: areas[1]._id,
        acquisitionDate: new Date('2023-01-10T00:00:00.000Z'),
        source: 'SENTINEL_2',
        imageUrl: 'http://localhost:5000/assets/scenes/pulicat_2023.svg',
        thumbnailUrl: 'http://localhost:5000/assets/scenes/pulicat_2023.svg',
        cloudCoverPercent: 1.5,
        resolutionMeters: 10,
        bounds: areas[1].boundary,
        processingStatus: 'READY'
      },
      {
        monitoringArea: areas[1]._id,
        acquisitionDate: new Date('2024-01-15T00:00:00.000Z'),
        source: 'PREPARED_DEMO',
        imageUrl: 'http://localhost:5000/assets/scenes/pulicat_2024.svg',
        thumbnailUrl: 'http://localhost:5000/assets/scenes/pulicat_2024.svg',
        cloudCoverPercent: 4.0,
        resolutionMeters: 10,
        bounds: areas[1].boundary,
        processingStatus: 'READY'
      }
    ]);
    console.log(`[Seed] Created ${scenes.length} satellite scenes`);

    // 4. Create Prepared Change Analysis
    const analysis = await ChangeAnalysis.create({
      monitoringArea: areas[0]._id,
      earlierScene: scenes[0]._id,
      laterScene: scenes[2]._id,
      method: 'PREPARED_RESULT',
      status: 'COMPLETED',
      changeMaskUrl: 'http://localhost:5000/assets/scenes/wg_mask.svg',
      overlayUrl: 'http://localhost:5000/assets/scenes/wg_2024.svg',
      changedAreaSqMeters: 148000,
      changedAreaHectares: 14.8,
      regions: [
        {
          regionId: 'REG-2024-001',
          category: 'VEGETATION_LOSS',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [75.69, 12.48],
                [75.72, 12.48],
                [75.72, 12.51],
                [75.69, 12.51],
                [75.69, 12.48]
              ]
            ]
          },
          centroid: {
            type: 'Point',
            coordinates: [75.705, 12.495]
          },
          areaSqMeters: 92000,
          confidence: 0.91,
          protectedZoneOverlap: true,
          reviewStatus: 'PENDING'
        },
        {
          regionId: 'REG-2024-002',
          category: 'NEW_CONSTRUCTION',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [75.66, 12.46],
                [75.68, 12.46],
                [75.68, 12.48],
                [75.66, 12.48],
                [75.66, 12.46]
              ]
            ]
          },
          centroid: {
            type: 'Point',
            coordinates: [75.67, 12.47]
          },
          areaSqMeters: 56000,
          confidence: 0.84,
          protectedZoneOverlap: false,
          reviewStatus: 'PENDING'
        }
      ],
      qualityNotes: [
        'Prepared demonstration dataset with pre-computed Sentinel-2 differential band index.',
        'Cloud cover < 5% on both acquisition scenes.',
        'Spatial resolution: 10m per ground pixel.',
        'Protected zone intersection verified against Shola Forest Nature Reserve official bounds.'
      ],
      completedAt: new Date()
    });
    console.log(`[Seed] Created prepared change analysis ${analysis._id}`);

    const pulicatAnalysis = await ChangeAnalysis.create({
      monitoringArea: areas[1]._id,
      earlierScene: scenes[3]._id,
      laterScene: scenes[4]._id,
      method: 'PREPARED_RESULT',
      status: 'COMPLETED',
      changeMaskUrl: 'http://localhost:5000/assets/scenes/pulicat_mask.svg',
      overlayUrl: 'http://localhost:5000/assets/scenes/pulicat_2024.svg',
      changedAreaSqMeters: 85000,
      changedAreaHectares: 8.5,
      regions: [
        {
          regionId: 'REG-2024-003',
          category: 'WATER_CHANGE',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [80.17, 13.52],
                [80.21, 13.52],
                [80.21, 13.56],
                [80.17, 13.56],
                [80.17, 13.52]
              ]
            ]
          },
          centroid: {
            type: 'Point',
            coordinates: [80.19, 13.54]
          },
          areaSqMeters: 52000,
          confidence: 0.89,
          protectedZoneOverlap: true,
          reviewStatus: 'PENDING'
        },
        {
          regionId: 'REG-2024-004',
          category: 'NEW_CONSTRUCTION',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [80.22, 13.53],
                [80.24, 13.53],
                [80.24, 13.55],
                [80.22, 13.55],
                [80.22, 13.53]
              ]
            ]
          },
          centroid: {
            type: 'Point',
            coordinates: [80.23, 13.54]
          },
          areaSqMeters: 33000,
          confidence: 0.82,
          protectedZoneOverlap: false,
          reviewStatus: 'PENDING'
        }
      ],
      qualityNotes: [
        'Prepared demonstration dataset with pre-computed Sentinel-2 multi-spectral NDWI differential.',
        'Cloud cover < 5% on both baseline (2023-01-10) and current (2024-01-15) passes.',
        'Lagoon boundary change correlated with low seasonal tide and aquaculture bund expansion.',
        'Ramsar wetland core zone intersection flagged for verification.'
      ],
      completedAt: new Date()
    });
    console.log(`[Seed] Created prepared change analysis for Pulicat ${pulicatAnalysis._id}`);

    // 5. Create Three Inspection Tasks in Different Statuses (OPEN, IN_PROGRESS, VERIFIED)
    const inspectionTasks = await InspectionTask.create([
      {
        analysis: analysis._id,
        monitoringArea: areas[0]._id,
        regionId: 'REG-2024-001',
        title: 'Suspected canopy clearing near Shola reserve boundary',
        description: 'Multi-temporal comparison indicates ~9.2 ha vegetation loss directly intersecting Shola Forest Nature Reserve buffer. Immediate field perimeter check requested.',
        priority: 'HIGH',
        status: 'OPEN',
        assignedTo: 'Officer P. Deshmukh',
        evidenceUrls: [],
        inspectionNotes: 'Assigned to Sector 4 field squad. Dispatch pending ground GPS clearance.'
      },
      {
        analysis: analysis._id,
        monitoringArea: areas[0]._id,
        regionId: 'REG-2024-002',
        title: 'Built-up encroachment report on eastern perimeter',
        description: 'Rectangular structural footprints detected in commercial agricultural boundary zone (~5.6 ha). Verification required for municipal zoning compliance.',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        assignedTo: 'Officer R. Sharma',
        evidenceUrls: [],
        inspectionNotes: 'Field team mobilized with handheld GNSS receiver. Initial drone flyover scheduled.'
      },
      {
        analysis: analysis._id,
        monitoringArea: areas[0]._id,
        regionId: 'REG-2023-088',
        title: 'Authorized seasonal reservoir fluctuation',
        description: 'Downstream hydrological change along river bend. Verified as seasonal water level drawdown permitted under regional irrigation authority schedule.',
        priority: 'LOW',
        status: 'VERIFIED',
        assignedTo: 'Officer M. Patel',
        evidenceUrls: [],
        inspectionNotes: 'Corroborated against Department of Water Resources seasonal weir discharge logs. No illegal diversion found.',
        reviewedBy: 'Chief Inspector V. Rao',
        reviewedAt: new Date('2024-03-25T11:00:00.000Z')
      }
    ]);
    console.log(`[Seed] Created ${inspectionTasks.length} inspection tasks`);

    console.log('\n[Seed Success] Database populated with all required demonstration data!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error] Failed to seed database:', error);
    process.exit(1);
  }
};

seedDatabase();
