import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Response interceptor to normalize error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorPayload = error.response?.data?.error || {
      message: error.message || 'Network error occurred',
      code: 'NETWORK_ERROR',
    };
    return Promise.reject(errorPayload);
  }
);

// Health & System
export const getHealth = () => api.get('/health');

// Dashboard Overview
export const getDashboard = () => api.get('/dashboard');

// Monitoring Areas
export const getAreas = () => api.get('/areas');
export const getArea = (id) => api.get(`/areas/${id}`);
export const getAreaScenes = (id) => api.get(`/areas/${id}/scenes`);
export const createArea = (data) => api.post('/areas', data);

// Satellite Scenes
export const getScenes = (params) => api.get('/scenes', { params });
export const getScene = (id) => api.get(`/scenes/${id}`);

// Change Analyses
export const getAnalyses = (params) => api.get('/analyses', { params });
export const getAnalysis = (id) => api.get(`/analyses/${id}`);
export const createAnalysis = (data) => api.post('/analyses', data);

// Protected Zones
export const getProtectedZones = () => api.get('/protected-zones');
export const createProtectedZone = (data) => api.post('/protected-zones', data);

// Inspections
export const getInspections = (params) => api.get('/inspections', { params });
export const getInspection = (id) => api.get(`/inspections/${id}`);
export const createInspection = (data) => api.post('/inspections', data);
export const updateInspection = (id, data) => api.patch(`/inspections/${id}`, data);

export default api;
