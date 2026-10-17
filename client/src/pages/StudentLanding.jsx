import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExams, getAttempts } from '../api';
import { useAuth } from '../context/AuthContext';

export const StudentLanding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStudentData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [examsData, attemptsData] = await Promise.all([
        getExams(),
        getAttempts().catch(() => ({ attempts: [] })),
      ]);
      setExams(examsData.exams || []);
      setAttempts(attemptsData.attempts || []);
    } catch (err) {
      setError(err.message || 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, []);

  const handleStartExam = (examId) => {
    navigate(`/exam/${examId}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Welcome Banner */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderLeft: '4px solid var(--status-low)' }}>
        <div>
          <span className="badge badge-low">Student Examination Portal</span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>
            Welcome, {user?.name || 'Student'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Select an active published exam to read the privacy requirements and begin your assessment.
          </p>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div style={{
        background: 'rgba(99, 102, 241, 0.08)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem',
      }}>
        <div style={{ fontSize: '1.75rem', lineHeight: 1 }}>🛡️</div>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>
            Privacy-First Proctoring Guarantee
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            ProctorVision monitors your exam session by processing camera frames <strong>locally in your browser</strong>.
            Your continuous video is <strong>never uploaded or stored on servers</strong>. Only explainable event metadata
            (such as tab switches or head-turns) is recorded for human teacher review.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--status-high-bg)', border: '1px solid var(--status-high)', color: 'var(--status-high)', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Section: Published Exams */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            Available Assessments ({exams.length})
          </h2>
          <button className="btn btn-secondary" onClick={loadStudentData} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Loading available examinations...
          </div>
        ) : exams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No published exams are available right now. Please check back when your instructor publishes one.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {exams.map((exam) => (
              <div
                key={exam._id}
                style={{
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className="badge badge-low">READY TO TAKE</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      ⏱️ {Math.round((exam.durationSeconds || 600) / 60)} mins
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
                    {exam.title}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {exam.description || 'No description provided.'}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    ❓ {exam.questions?.length || 0} Questions
                  </span>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleStartExam(exam._id)}
                    style={{ fontSize: '0.825rem', padding: '0.5rem 1rem' }}
                  >
                    Start Exam 🚀
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section: Past & In-Progress Attempts */}
      {attempts.length > 0 && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            Your Attempt History
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {attempts.map((att) => (
              <div
                key={att._id}
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                    {att.exam?.title || 'Exam Assessment'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                    Started: {new Date(att.startedAt).toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className={`badge ${att.status === 'SUBMITTED' ? 'badge-low' : att.status === 'IN_PROGRESS' ? 'badge-medium' : 'badge-high'}`}>
                    {att.status}
                  </span>

                  {att.status === 'IN_PROGRESS' && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleStartExam(att.exam?._id || att.exam)}
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                    >
                      Resume Attempt →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentLanding;
