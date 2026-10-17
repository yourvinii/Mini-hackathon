import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { TeacherLanding } from './pages/TeacherLanding';
import { StudentLanding } from './pages/StudentLanding';

// Home redirector based on authentication role
function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        Loading session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === 'TEACHER' ? '/teacher' : '/student'} replace />;
}

// Placeholder for Chunk 2: Student Exam Experience
function ExamSessionStub() {
  const { id } = useParams();
  return (
    <div className="card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ fontSize: '2.5rem' }}>🎯</div>
      <span className="badge badge-medium" style={{ margin: '0 auto' }}>Chunk 2 Destination</span>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Student Exam Experience</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Exam ID: <code>{id}</code>
      </p>
      <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: 1.5 }}>
        This page will contain the camera consent prompt, local MediaPipe/TF.js proctoring indicators, timed countdown, and multiple-choice answering interface in <strong>Chunk 2</strong>.
      </p>
      <Link to="/student" className="btn btn-secondary" style={{ margin: '0 auto' }}>
        ← Back to Student Portal
      </Link>
    </div>
  );
}

// Placeholder for Chunk 5: Teacher Review Dashboard
function TeacherDashboardStub() {
  return (
    <div className="card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ fontSize: '2.5rem' }}>📊</div>
      <span className="badge badge-medium" style={{ margin: '0 auto' }}>Chunk 5 Destination</span>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Teacher Review Dashboard</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: 1.5 }}>
        This page will contain the live active attempts monitor, forensic event timeline, false-alarm adjustments, and detection stats breakdown in <strong>Chunk 5 & 6</strong>.
      </p>
      <Link to="/teacher" className="btn btn-secondary" style={{ margin: '0 auto' }}>
        ← Back to Teacher Exam Management
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navbar />
          <main>
            <Routes>
              {/* Root redirect */}
              <Route path="/" element={<RootRedirect />} />

              {/* Public Auth */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Teacher Routes */}
              <Route
                path="/teacher"
                element={
                  <ProtectedRoute allowedRoles={['TEACHER']}>
                    <TeacherLanding />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['TEACHER']}>
                    <TeacherDashboardStub />
                  </ProtectedRoute>
                }
              />

              {/* Protected Student Routes */}
              <Route
                path="/student"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <StudentLanding />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/exam/:id"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <ExamSessionStub />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
