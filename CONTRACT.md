# LandWatch API Contract Specification

This document details the HTTP REST API contracts for the LandWatch Satellite Change Detection & Land Protection Platform.

Base URL: `http://localhost:5000/api`

---

## 1. General Standards

### Success Response Format
Standard JSON responses return objects with direct resource keys or data payloads.

### Standard Error Response Format
All 4xx and 5xx errors return a consistent JSON structure:
```json
{
  "success": false,
  "error": {
    "message": "Human-readable error explanation",
    "code": "VALIDATION_ERROR | NOT_FOUND | BAD_REQUEST | SERVER_ERROR",
    "details": []
  }
}
```

---

## 2. Endpoints

### 2.1 Health Check
- **Route**: `GET /api/health`
- **Description**: Returns the server status.
- **Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-10-17T08:30:00.000Z",
  "uptime": 124.5
}
```

---

### 2.2 Dashboard
- **Route**: `GET /api/dashboard`
- **Description**: Aggregated counts and recent activity for the main command dashboard.
- **Response**:
```json
{
  "summary": {
    "monitoredAreas": 3,
    "completedAnalyses": 1,
    "pendingInspections": 2,
    "protectedZoneAlerts": 1
  },
  "recentAnalyses": [
    {
      "_id": "6710db4e815047f3b890a001",
      "monitoringArea": {
        "_id": "6710dae0815047f3b8909001",
        "name": "Western Ghats Ecological Corridor - Sector 4",
        "region": "Karnataka/Kerala Border"
      },
      "earlierScene": {
        "_id": "6710dae0815047f3b8909101",
        "acquisitionDate": "2023-03-15T00:00:00.000Z"
      },
      "laterScene": {
        "_id": "6710dae0815047f3b8909102",
        "acquisitionDate": "2024-03-20T00:00:00.000Z"
      },
      "method": "PREPARED_RESULT",
      "status": "COMPLETED",
      "changedAreaHectares": 14.8,
      "regionsCount": 2,
      "createdAt": "2026-10-17T08:00:00.000Z"
    }
  ]
}
```

---

### 2.3 Monitoring Areas

#### `GET /api/areas`
- **Description**: List all monitored geographical areas.
- **Response**:
```json
{
  "areas": [
    {
      "_id": "6710dae0815047f3b8909001",
      "name": "Western Ghats Ecological Corridor - Sector 4",
      "description": "High-biodiversity tropical wet evergreen forest buffer zone.",
      "region": "Western Ghats, India",
      "status": "ACTIVE",
      "boundary": {
        "type": "Polygon",
        "coordinates": [
          [
            [75.65, 12.45],
            [75.75, 12.45],
            [75.75, 12.55],
            [75.65, 12.55],
            [75.65, 12.45]
          ]
        ]
      },
      "centroid": {
        "type": "Point",
        "coordinates": [75.70, 12.50]
      },
      "scenesCount": 2,
      "latestAnalysisDate": "2024-03-20T00:00:00.000Z",
      "createdAt": "2026-10-17T07:30:00.000Z"
    }
  ]
}
```

#### `GET /api/areas/:id`
- **Description**: Get single area details including its registered satellite scenes.
- **Response**:
```json
{
  "area": {
    "_id": "6710dae0815047f3b8909001",
    "name": "Western Ghats Ecological Corridor - Sector 4",
    "description": "High-biodiversity tropical wet evergreen forest buffer zone.",
    "region": "Western Ghats, India",
    "status": "ACTIVE",
    "boundary": {
      "type": "Polygon",
      "coordinates": [[[75.65, 12.45], [75.75, 12.45], [75.75, 12.55], [75.65, 12.55], [75.65, 12.45]]]
    },
    "centroid": {
      "type": "Point",
      "coordinates": [75.70, 12.50]
    }
  },
  "scenes": [
    {
      "_id": "6710dae0815047f3b8909101",
      "monitoringArea": "6710dae0815047f3b8909001",
      "acquisitionDate": "2023-03-15T00:00:00.000Z",
      "source": "PREPARED_DEMO",
      "imageUrl": "/assets/scenes/wg_2023.jpg",
      "cloudCoverPercent": 2.4,
      "resolutionMeters": 10,
      "processingStatus": "READY"
    }
  ]
}
```

#### `GET /api/areas/:id/scenes`
- **Description**: Returns all satellite scenes for the area sorted chronologically by acquisition date.
- **Response**:
```json
{
  "scenes": [
    {
      "_id": "6710dae0815047f3b8909101",
      "acquisitionDate": "2023-03-15T00:00:00.000Z",
      "source": "PREPARED_DEMO",
      "imageUrl": "/assets/scenes/wg_2023.jpg",
      "cloudCoverPercent": 2.4,
      "resolutionMeters": 10
    },
    {
      "_id": "6710dae0815047f3b8909102",
      "acquisitionDate": "2024-03-20T00:00:00.000Z",
      "source": "PREPARED_DEMO",
      "imageUrl": "/assets/scenes/wg_2024.jpg",
      "cloudCoverPercent": 3.1,
      "resolutionMeters": 10
    }
  ]
}
```

#### `POST /api/areas`
- **Request Body**:
```json
{
  "name": "Northern Ridge Buffer",
  "description": "Sensitive catchment area",
  "region": "Northern Sector",
  "boundary": {
    "type": "Polygon",
    "coordinates": [[[77.10, 28.60], [77.20, 28.60], [77.20, 28.70], [77.10, 28.70], [77.10, 28.60]]]
  }
}
```

---

### 2.4 Change Analyses

#### `GET /api/analyses`
- **Query Params**: `?areaId=...&status=COMPLETED`
- **Response**:
```json
{
  "analyses": [
    {
      "_id": "6710db4e815047f3b890a001",
      "monitoringArea": {
        "_id": "6710dae0815047f3b8909001",
        "name": "Western Ghats Ecological Corridor - Sector 4"
      },
      "earlierScene": {
        "_id": "6710dae0815047f3b8909101",
        "acquisitionDate": "2023-03-15T00:00:00.000Z"
      },
      "laterScene": {
        "_id": "6710dae0815047f3b8909102",
        "acquisitionDate": "2024-03-20T00:00:00.000Z"
      },
      "method": "PREPARED_RESULT",
      "status": "COMPLETED",
      "changedAreaHectares": 14.8,
      "changedAreaSqMeters": 148000,
      "regions": [
        {
          "regionId": "REG-2024-001",
          "category": "VEGETATION_LOSS",
          "areaSqMeters": 92000,
          "confidence": 0.88,
          "protectedZoneOverlap": true,
          "reviewStatus": "PENDING"
        }
      ],
      "qualityNotes": [
        "Prepared demonstration dataset",
        "Cloud cover < 5% on both scenes"
      ],
      "createdAt": "2026-10-17T08:00:00.000Z"
    }
  ]
}
```

#### `GET /api/analyses/:id`
- **Description**: Returns detailed analysis with all detected regions and quality metadata.

#### `POST /api/analyses`
- **Request Body**:
```json
{
  "areaId": "6710dae0815047f3b8909001",
  "earlierSceneId": "6710dae0815047f3b8909101",
  "laterSceneId": "6710dae0815047f3b8909102",
  "method": "PREPARED_RESULT"
}
```
- **Validation**:
  - `areaId`, `earlierSceneId`, `laterSceneId` are required ObjectIds.
  - Both scenes must belong to the specified area.
  - Earlier and later scene IDs must differ and have distinct acquisition dates.

---

### 2.5 Protected Zones

#### `GET /api/protected-zones`
- **Response**:
```json
{
  "protectedZones": [
    {
      "_id": "6710dae0815047f3b8909051",
      "name": "Shola Forest Nature Reserve",
      "description": "High-altitude montane evergreen forest ecosystem with legal sanctuary status.",
      "category": "FOREST",
      "source": "DEMO",
      "boundary": {
        "type": "Polygon",
        "coordinates": [[[75.68, 12.47], [75.74, 12.47], [75.74, 12.53], [75.68, 12.53], [75.68, 12.47]]]
      }
    }
  ]
}
```

---

### 2.6 Inspection Tasks

#### `GET /api/inspections`
- **Query Params**: `?status=OPEN&priority=HIGH`
- **Response**:
```json
{
  "tasks": [
    {
      "_id": "6710db4e815047f3b890c001",
      "analysis": "6710db4e815047f3b890a001",
      "monitoringArea": {
        "_id": "6710dae0815047f3b8909001",
        "name": "Western Ghats Ecological Corridor - Sector 4"
      },
      "regionId": "REG-2024-001",
      "title": "Suspected canopy clearing near Shola reserve boundary",
      "description": "Satellite comparison reveals ~9.2 ha vegetation loss intersecting Shola reserve buffer.",
      "priority": "HIGH",
      "status": "OPEN",
      "assignedTo": "Officer P. Deshmukh",
      "evidenceUrls": [],
      "createdAt": "2026-10-17T08:15:00.000Z"
    }
  ]
}
```

#### `POST /api/inspections`
- **Request Body**:
```json
{
  "analysisId": "6710db4e815047f3b890a001",
  "regionId": "REG-2024-001",
  "title": "Field verification for detected anomaly",
  "description": "Inspect perimeter coordinates for physical boundary encroachment.",
  "priority": "HIGH",
  "assignedTo": "Officer R. Sharma"
}
```

#### `GET /api/inspections/:id`
- **Description**: Returns inspection task with populated area and analysis details.

#### `PATCH /api/inspections/:id`
- **Request Body**:
```json
{
  "status": "IN_PROGRESS",
  "assignedTo": "Officer R. Sharma",
  "inspectionNotes": "Field team dispatched with GPS unit. Ground survey pending."
}
```
- **Allowed Statuses**: `OPEN`, `IN_PROGRESS`, `VERIFIED`, `DISMISSED`.
