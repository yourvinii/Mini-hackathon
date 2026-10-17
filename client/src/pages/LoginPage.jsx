import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const from = location.state?.from?.pathname;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await loginUser(email, password);
      if (from) {
        navigate(from, { replace: true });
      } else {
        navigate(user.role === 'TEACHER' ? '/teacher' : '/student', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setLoading(true);
    setError(null);
    try {
      const user = await loginUser(demoEmail, demoPassword);
      navigate(user.role === 'TEACHER' ? '/teacher' : '/student', { replace: true });
    } catch (err) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '3rem auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            marginBottom: '0.75rem',
          }}>
            🔐
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Welcome to ProctorVision</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Sign in to access your proctored assessments or teaching portal
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--status-high-bg)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--status-high)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. teacher@proctorvision.local"
              required
              className="input-field"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="input-field"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          margin: '0.5rem 0',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Demo 1-Click Access</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
        </div>

        {/* Quick Demo Login Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => quickLogin('teacher@proctorvision.local', 'teacher123')}
            disabled={loading}
            style={{
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#fff' }}>
                👨‍🏫 Login as Demo Teacher
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Dr. Sarah Connor • Exam Management & Review
              </div>
            </div>
            <span className="badge badge-medium">TEACHER</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => quickLogin('student@proctorvision.local', 'student123')}
            disabled={loading}
            style={{
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#fff' }}>
                🧑‍🎓 Login as Demo Student
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Alex Rivera • Take Assessments
              </div>
            </div>
            <span className="badge badge-low">STUDENT</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
