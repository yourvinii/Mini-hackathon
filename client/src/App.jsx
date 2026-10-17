import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { getHealth, getExams } from './api';

function FoundationHome() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [error, setError] = useState(null);

  const checkConnection = async () => {
    setLoadingHealth(true);
    setError(null);
    try {
      const data = await getHealth();
      setHealthStatus(data);
    } catch (err) {
      setError(err.message || 'Cannot reach API server');
      setHealthStatus(null);
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Hero Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '4px solid var(--accent-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge badge-low" style={{ marginBottom: '0.5rem' }}>Chunk 0 Foundation Ready</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginTop: '0.25rem' }}>
              ProctorVision Prototype
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
              Privacy-First In-Browser AI Exam Proctoring Platform
            </p>
          </div>
          <div>
            <button className="btn btn-primary" onClick={checkConnection} disabled={loadingHealth}>
              {loadingHealth ? 'Pinging API...' : '🔄 Test Backend API'}
            </button>
          </div>
        </div>

        {/* API Health Banner */}
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          border: '1px solid var(--border-color)',
        }}>
          <div>
            <strong>Backend API: </strong>
            {healthStatus ? (
              <span className="badge badge-low" style={{ marginLeft: '0.5rem' }}>● Connected (Port 5000)</span>
            ) : error ? (
              <span className="badge badge-high" style={{ marginLeft: '0.5rem' }}>✕ Offline: {error}</span>
            ) : (
              <span className="badge badge-medium" style={{ marginLeft: '0.5rem' }}>... Checking</span>
            )}
          </div>
          {healthStatus && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>
              Server Time: {new Date(healthStatus.timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Grid: Demo Accounts & Foundation Checklist */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Seed Credentials */}
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🔑</span> Seeded Demo Accounts
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <strong>Demo Teacher</strong>
                <span className="badge badge-medium">TEACHER ROLE</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Email: <code style={{ color: '#fff' }}>teacher@proctorvision.local</code>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Password: <code style={{ color: '#fff' }}>teacher123</code>
              </div>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <strong>Demo Student</strong>
                <span className="badge badge-low">STUDENT ROLE</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Email: <code style={{ color: '#fff' }}>student@proctorvision.local</code>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Password: <code style={{ color: '#fff' }}>student123</code>
              </div>
            </div>
          </div>
        </div>

        {/* Deliverables Completed */}
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📦</span> Chunk 0 Deliverables
          </h2>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--status-low)' }}>✓</span> Express, CORS, Dotenv & Centralized Error Handler
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--status-low)' }}>✓</span> Mongoose Models: User, Exam, Attempt, ProctorEvent, ReviewDecision
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--status-low)' }}>✓</span> JWT Authentication & Teacher/Student Role Guards
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--status-low)' }}>✓</span> Request Validation for Critical Endpoints
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--status-low)' }}>✓</span> Explainable Risk Scoring Engine with False-Alarm Dismissal
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--status-low)' }}>✓</span> Seed Script with Demo Accounts, Exam & Sample Events
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--status-low)' }}>✓</span> <code>src/api.js</code> Client with 1 Function per Endpoint
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--status-low)' }}>✓</span> Comprehensive <code>CONTRACT.md</code> API Documentation
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Navigation Bar */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '1.5rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fff', textDecoration: 'none' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
            }}>
              🛡️
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>ProctorVision</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Privacy-First Proctoring</div>
            </div>
          </Link>

          <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.875rem' }}>
            <Link to="/" style={{ color: 'var(--text-main)', fontWeight: 600 }}>Home</Link>
            <span style={{ color: 'var(--text-dim)' }}>|</span>
            <span style={{ color: 'var(--text-dim)', cursor: 'not-allowed' }} title="Coming in Chunk 1">Teacher Portal</span>
            <span style={{ color: 'var(--text-dim)' }}>|</span>
            <span style={{ color: 'var(--text-dim)', cursor: 'not-allowed' }} title="Coming in Chunk 2">Student Exam</span>
          </nav>
        </header>

        {/* Main View Routes */}
        <main>
          <Routes>
            <Route path="/" element={<FoundationHome />} />
            <Route path="*" element={<FoundationHome />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
