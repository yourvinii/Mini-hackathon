import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { user, isAuthenticated, isTeacher, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: '1.5rem',
      marginBottom: '2rem',
      borderBottom: '1px solid var(--border-color)',
      flexWrap: 'wrap',
      gap: '1rem',
    }}>
      {/* Brand */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: '#fff' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.35rem',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
        }}>
          🛡️
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>ProctorVision</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Privacy-First AI Proctoring</div>
        </div>
      </Link>

      {/* Nav & Auth status */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.9rem' }}>
        {isAuthenticated ? (
          <>
            {isTeacher ? (
              <>
                <NavLink
                  to="/teacher"
                  style={({ isActive }) => ({
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    fontWeight: isActive ? 700 : 500,
                    textDecoration: 'none',
                  })}
                >
                  📝 Manage Exams
                </NavLink>
                <Link
                  to="/teacher/dashboard"
                  style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
                >
                  📊 Review Dashboard
                </Link>
              </>
            ) : (
              <>
                <NavLink
                  to="/student"
                  style={({ isActive }) => ({
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    fontWeight: isActive ? 700 : 500,
                    textDecoration: 'none',
                  })}
                >
                  📚 Available Exams
                </NavLink>
              </>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'var(--bg-tertiary)',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {user.name}
                </span>
                <span style={{ fontSize: '0.7rem', color: isTeacher ? 'var(--status-medium)' : 'var(--status-low)', textTransform: 'uppercase', fontWeight: 700 }}>
                  {user.role}
                </span>
              </div>
              <button
                className="btn btn-secondary"
                onClick={handleLogout}
                style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                title="Log out of ProctorVision"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <Link to="/login" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
            Sign In
          </Link>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
