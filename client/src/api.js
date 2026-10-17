import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization Bearer token from localStorage to every outgoing request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('proctorvision_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Helper response interceptor for consistent error extraction
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message || 'API request failed';
    return Promise.reject(new Error(message));
  }
);

// Token helpers
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('proctorvision_token', token);
  } else {
    localStorage.removeItem('proctorvision_token');
  }
};

export const getAuthToken = () => localStorage.getItem('proctorvision_token');
export const clearAuthToken = () => localStorage.removeItem('proctorvision_token');

// ==========================================
// 1. System Health
// ==========================================
export const getHealth = () => apiClient.get('/health');

// ==========================================
// 2. Authentication
// ==========================================
export const login = ({ email, password }) =>
  apiClient.post('/auth/login', { email, password });

export const getMe = () =>
  apiClient.get('/auth/me');

// ==========================================
// 3. Exams
// ==========================================
export const createExam = (examData) =>
  apiClient.post('/exams', examData);

export const getExams = () =>
  apiClient.get('/exams');

export const getExam = (id) =>
  apiClient.get(`/exams/${id}`);

export const publishExam = (id) =>
  apiClient.patch(`/exams/${id}/publish`);

// ==========================================
// 4. Student Attempts
// ==========================================
export const createAttempt = ({ examId, cameraConsent }) =>
  apiClient.post('/attempts', { examId, cameraConsent });

export const getAttempt = (id) =>
  apiClient.get(`/attempts/${id}`);

export const submitAttempt = (id, { answers }) =>
  apiClient.post(`/attempts/${id}/submit`, { answers });

// ==========================================
// 5. Browser-Generated Proctoring Events
// ==========================================
export const recordEvents = (attemptId, { events }) =>
  apiClient.post(`/attempts/${attemptId}/events`, { events });

export const getAttemptEvents = (attemptId) =>
  apiClient.get(`/attempts/${attemptId}/events`);

// ==========================================
// 6. Teacher Review & Monitoring
// ==========================================
export const getTeacherDashboard = () =>
  apiClient.get('/teacher/dashboard');

export const getAttemptReview = (attemptId) =>
  apiClient.get(`/teacher/attempts/${attemptId}/review`);

export const reviewEvent = (eventId, { decision, note }) =>
  apiClient.patch(`/teacher/events/${eventId}/review`, { decision, note });

export const getDetectionStats = () =>
  apiClient.get('/teacher/detection-stats');

// Grouped namespace exports
export const authApi = { login, getMe, setAuthToken, getAuthToken, clearAuthToken };
export const examApi = { createExam, getExams, getExam, publishExam };
export const attemptApi = { createAttempt, getAttempt, submitAttempt, recordEvents, getAttemptEvents };
export const teacherApi = { getTeacherDashboard, getAttemptReview, reviewEvent, getDetectionStats };
export const systemApi = { getHealth };

export default {
  apiClient,
  auth: authApi,
  exams: examApi,
  attempts: attemptApi,
  teacher: teacherApi,
  system: systemApi,
};
