# LandWatch — AI-Powered Satellite Change Detection & Land Protection Platform

LandWatch is a geospatial intelligence and land monitoring platform designed for environmental officers and local authorities to identify, track, and verify land-use anomalies (vegetation loss, new construction expansion, protected zone encroachment, and waterbody shrinkage) by comparing multi-temporal satellite scenes.

---

## Architecture & Structure

```
mini-hackathon/
├── CONTRACT.md           # Full REST API contract documentation
├── project.md            # Hackathon project requirements and guidelines
├── server/               # Express + Node.js + Mongoose backend
│   ├── src/
│   │   ├── config/       # MongoDB connection configuration
│   │   ├── middleware/   # Request validation & centralized error handler
│   │   ├── models/       # Mongoose schemas (Area, Scene, Analysis, Zone, Inspection)
│   │   ├── routes/       # Express route handlers
│   │   ├── app.js        # Express app definition & middleware setup
│   │   ├── index.js      # Server entrypoint
│   │   └── seed.js       # Demo database seeder script
│   ├── .env.example
│   └── package.json
└── client/               # Vite + React frontend with Tailwind CSS
    ├── src/
    │   ├── components/   # AppLayout, Sidebar, Topbar, StatusBadge, MapView, etc.
    │   ├── pages/        # Dashboard, Analysis, Areas, Inspections, ProtectedZones
    │   ├── api.js        # API service client
    │   ├── App.jsx       # Route declarations
    │   └── main.jsx
    └── package.json
```

---

## Getting Started

### Prerequisites
- Node.js (v18+ or v20+)
- MongoDB running locally (default: `mongodb://127.0.0.1:27017/landwatch`)

---

### 1. Backend Setup (`/server`)

1. Change directory to server:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   Create `.env` (or copy `.env.example`):
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/landwatch
   CLIENT_URL=http://localhost:5173
   NODE_ENV=development
   ```

4. Seed the demonstration dataset:
   ```bash
   npm run seed
   ```

5. Start the backend server:
   ```bash
   npm run dev
   # or
   npm start
   ```
   The backend API will run on `http://localhost:5000`.

---

### 2. Frontend Setup (`/client`)

1. Change directory to client:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   Create `.env` (or copy `.env.example`):
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The frontend application will run on `http://localhost:5173`.

---

## Chunk Implementation Status

- **Chunk 0: Foundation** (Completed)
  - Scaffolding of `/server` and `/client`
  - Express server with CORS, Mongoose, centralized error handling, and request validation
  - Mongoose models: `MonitoringArea`, `SatelliteScene`, `ChangeAnalysis`, `ProtectedZone`, `InspectionTask`
  - Seed database script with demo monitoring areas, satellite scenes, prepared change analysis, protected zones, and inspection tasks
  - React + Vite + Tailwind CSS frontend with React Router, Leaflet, Lucide icons, and Axios
  - Polished responsive UI with Dashboard, Analysis, Monitoring Areas, Inspections, and Protected Zones
  - API documentation in `CONTRACT.md`
