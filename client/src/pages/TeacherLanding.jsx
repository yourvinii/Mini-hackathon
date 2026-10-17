import React, { useState, useEffect } from 'react';
import { getExams, createExam, updateExam, publishExam } from '../api';
import { useAuth } from '../context/AuthContext';

export const TeacherLanding = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState(null);
  const [previewExam, setPreviewExam] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [questions, setQuestions] = useState([
    {
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
    },
  ]);
  const [saving, setSaving] = useState(false);

  const fetchExams = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExams();
      setExams(data.exams || []);
    } catch (err) {
      setError(err.message || 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const openCreateModal = () => {
    setEditingExamId(null);
    setTitle('');
    setDescription('');
    setDurationMinutes(10);
    setQuestions([
      {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
      },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (exam) => {
    setEditingExamId(exam._id);
    setTitle(exam.title || '');
    setDescription(exam.description || '');
    setDurationMinutes(Math.round((exam.durationSeconds || 600) / 60));
    setQuestions(
      exam.questions && exam.questions.length > 0
        ? exam.questions.map((q) => ({
            question: q.question,
            options: [...q.options],
            correctAnswer: q.correctAnswer ?? 0,
          }))
        : [
            {
              question: '',
              options: ['', '', '', ''],
              correctAnswer: 0,
            },
          ]
    );
    setIsModalOpen(true);
  };

  const handlePublish = async (examId) => {
    try {
      await publishExam(examId);
      setSuccessMsg('Exam published successfully! Students can now access and attempt it.');
      fetchExams();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to publish exam');
    }
  };

  // Question editing helpers
  const handleQuestionTextChange = (index, value) => {
    const updated = [...questions];
    updated[index].question = value;
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = value;
    setQuestions(updated);
  };

  const handleCorrectAnswerChange = (qIndex, optIndex) => {
    const updated = [...questions];
    updated[qIndex].correctAnswer = optIndex;
    setQuestions(updated);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
      },
    ]);
  };

  const removeQuestion = (index) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter an exam title');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        alert(`Question #${i + 1} has empty text.`);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].trim()) {
          alert(`Question #${i + 1}, Option #${j + 1} is empty.`);
          return;
        }
      }
    }

    setSaving(true);
    const payload = {
      title,
      description,
      durationSeconds: Math.max(60, Number(durationMinutes) * 60),
      questions,
    };

    try {
      if (editingExamId) {
        await updateExam(editingExamId, payload);
        setSuccessMsg('Exam updated successfully!');
      } else {
        await createExam(payload);
        setSuccessMsg('New draft exam created successfully!');
      }
      setIsModalOpen(false);
      fetchExams();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      alert(err.message || 'Failed to save exam');
    } finally {
      setSaving(false);
    }
  };

  // Metrics
  const totalExams = exams.length;
  const publishedCount = exams.filter((e) => e.status === 'PUBLISHED').length;
  const draftCount = exams.filter((e) => e.status === 'DRAFT').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Banner */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderLeft: '4px solid #f59e0b' }}>
        <div>
          <span className="badge badge-medium">Teacher Administration</span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>
            Assessment Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Author multiple choice exams, configure proctoring durations, and publish them for student attempts.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          ➕ Create New Exam
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{ background: 'var(--status-low-bg)', border: '1px solid var(--status-low)', color: 'var(--status-low)', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
          ✓ {successMsg}
        </div>
      )}
      {error && (
        <div style={{ background: 'var(--status-high-bg)', border: '1px solid var(--status-high)', color: 'var(--status-high)', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Total Created</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totalExams}</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '3px solid var(--status-low)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Published & Active</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-low)' }}>{publishedCount}</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '3px solid var(--status-medium)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Drafts</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-medium)' }}>{draftCount}</div>
        </div>
      </div>

      {/* Exams List */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Your Created Exams</h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Loading assessments...
          </div>
        ) : exams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No exams created yet. Click "Create New Exam" above to author your first assessment!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {exams.map((exam) => (
              <div
                key={exam._id}
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div style={{ maxWidth: '650px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{exam.title}</h3>
                    <span className={`badge ${exam.status === 'PUBLISHED' ? 'badge-low' : exam.status === 'DRAFT' ? 'badge-medium' : 'badge-high'}`}>
                      {exam.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    {exam.description || 'No description provided.'}
                  </p>
                  <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    <span>⏱️ Duration: <strong>{Math.round((exam.durationSeconds || 600) / 60)} mins</strong></span>
                    <span>❓ Questions: <strong>{exam.questions?.length || 0}</strong></span>
                    <span>📅 Created: {new Date(exam.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {exam.status === 'DRAFT' && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handlePublish(exam._id)}
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                    >
                      🚀 Publish
                    </button>
                  )}
                  <button
                    className="btn btn-secondary"
                    onClick={() => openEditModal(exam)}
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setPreviewExam(exam)}
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                  >
                    👁️ Preview
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE / EDIT EXAM MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {editingExamId ? '✏️ Edit Exam Assessment' : '➕ Author New Exam'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExam} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Exam Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Distributed Systems & Edge AI Final Exam"
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Description / Instructions
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain instructions and monitoring rules..."
                  rows={3}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Duration (Minutes) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  required
                  className="input-field"
                  style={{ width: '160px' }}
                />
              </div>

              {/* Questions Section */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                    Questions ({questions.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  >
                    + Add Question
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {questions.map((q, qIndex) => (
                    <div
                      key={qIndex}
                      style={{
                        background: 'var(--bg-secondary)',
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Question #{qIndex + 1}</span>
                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestion(qIndex)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--status-high)', fontSize: '0.8rem', cursor: 'pointer' }}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={q.question}
                        onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                        placeholder={`e.g. What is the role of client-side face landmarking?`}
                        className="input-field"
                        style={{ marginBottom: '0.75rem' }}
                        required
                      />

                      <div style={{ fontSize: '0.775rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
                        Options (select the radio button beside the correct answer):
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {q.options.map((opt, optIndex) => (
                          <div key={optIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                              type="radio"
                              name={`correct-${qIndex}`}
                              checked={q.correctAnswer === optIndex}
                              onChange={() => handleCorrectAnswerChange(qIndex, optIndex)}
                              title="Mark as correct answer"
                              style={{ cursor: 'pointer' }}
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                              className="input-field"
                              style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                              required
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingExamId ? 'Update Exam' : 'Create Draft Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW EXAM MODAL */}
      {previewExam && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '650px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <span className="badge badge-medium">Teacher Preview (Answer Keys Visible)</span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.25rem' }}>{previewExam.title}</h2>
              </div>
              <button
                onClick={() => setPreviewExam(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              {previewExam.description || 'No description.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {previewExam.questions?.map((q, qIndex) => (
                <div key={qIndex} style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                    {qIndex + 1}. {q.question}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                    {q.options?.map((opt, optIndex) => {
                      const isCorrect = q.correctAnswer === optIndex;
                      return (
                        <div
                          key={optIndex}
                          style={{
                            padding: '0.4rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            background: isCorrect ? 'var(--status-low-bg)' : 'transparent',
                            color: isCorrect ? 'var(--status-low)' : 'var(--text-main)',
                            fontWeight: isCorrect ? 600 : 400,
                            border: isCorrect ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span>{String.fromCharCode(65 + optIndex)}. {opt}</span>
                          {isCorrect && <span>✓ Correct Answer</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setPreviewExam(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherLanding;
