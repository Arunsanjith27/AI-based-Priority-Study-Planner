import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateSemester.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

const makeId = () => Math.random().toString(36).slice(2, 9);

const makeTopic = () => ({ id: makeId(), name: '' });
const makeSubject = () => ({
  id: makeId(),
  name: '',
  code: '',
  credits: '',
  topics: [makeTopic()],
});

/* ─── SVG Icons ──────────────────────────────────────────────────────────────── */

const BookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <line x1="12" y1="6" x2="12" y2="12" />
    <line x1="9" y1="9" x2="15" y2="9" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const LogOutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

/* ─── Component ──────────────────────────────────────────────────────────────── */

export default function CreateSemester() {
  const navigate = useNavigate();

  // ── Form state ──
  const [semesterName, setSemesterName] = useState('');
  const [subjects, setSubjects] = useState([makeSubject()]);

  // ── UI state ──
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [savedSemesterName, setSavedSemesterName] = useState('');

  // ── Auth guard — must be a useEffect so hooks are never called conditionally ──
  const token = localStorage.getItem('token');
  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  /* ── Client-side validation ─────────────────────────────────────────────── */

  const validate = useCallback(() => {
    const newErrors = {};
    let valid = true;

    // Semester name
    if (!semesterName.trim()) {
      newErrors['semesterName'] = 'Semester name is required';
      valid = false;
    }

    // Must have at least one subject
    if (subjects.length === 0) {
      newErrors['subjects'] = 'At least one subject is required';
      valid = false;
    }

    subjects.forEach((subject, si) => {
      // Subject name
      if (!subject.name.trim()) {
        newErrors[`subject_${si}_name`] = 'Subject name is required';
        valid = false;
      }

      // Credits
      const creditsNum = parseFloat(subject.credits);
      if (subject.credits === '' || subject.credits === null) {
        newErrors[`subject_${si}_credits`] = 'Credits are required';
        valid = false;
      } else if (isNaN(creditsNum) || creditsNum < 0.5 || creditsNum > 20) {
        newErrors[`subject_${si}_credits`] = 'Credits must be a number between 0.5 and 20';
        valid = false;
      }

      // Topics
      if (subject.topics.length === 0) {
        newErrors[`subject_${si}_topics`] = 'At least one topic is required';
        valid = false;
      }

      subject.topics.forEach((topic, ti) => {
        if (!topic.name.trim()) {
          newErrors[`subject_${si}_topic_${ti}`] = 'Topic name cannot be empty';
          valid = false;
        }
      });
    });

    setErrors(newErrors);
    return valid;
  }, [semesterName, subjects]);

  /* ── Subject handlers ───────────────────────────────────────────────────── */

  const addSubject = () => {
    setSubjects((prev) => [...prev, makeSubject()]);
  };

  const removeSubject = (subjectId) => {
    setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
    // Clear related errors
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`subject_`)) delete next[k];
      });
      return next;
    });
  };

  const updateSubject = (subjectId, field, value) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === subjectId ? { ...s, [field]: value } : s))
    );
  };

  /* ── Topic handlers ─────────────────────────────────────────────────────── */

  const addTopic = (subjectId) => {
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId ? { ...s, topics: [...s.topics, makeTopic()] } : s
      )
    );
  };

  const removeTopic = (subjectId, topicId) => {
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId
          ? { ...s, topics: s.topics.filter((t) => t.id !== topicId) }
          : s
      )
    );
  };

  const updateTopic = (subjectId, topicId, value) => {
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId
          ? {
              ...s,
              topics: s.topics.map((t) =>
                t.id === topicId ? { ...t, name: value } : t
              ),
            }
          : s
      )
    );
  };

  /* ── Submit ──────────────────────────────────────────────────────────────── */

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        name: semesterName.trim(),
        subjects: subjects.map((s) => ({
          name: s.name.trim(),
          code: s.code.trim(),
          credits: parseFloat(s.credits),
          topics: s.topics.map((t) => ({ name: t.name.trim() })),
        })),
      };

      const response = await fetch(`${API_BASE}/semesters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('student');
          navigate('/login');
          return;
        }
        setServerError(data.message || 'Failed to create semester. Please try again.');
        return;
      }

      setSavedSemesterName(semesterName.trim());
      setIsSuccess(true);
    } catch {
      setServerError('Unable to connect to the server. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('student');
    navigate('/login');
  };

  /* ── Success view ────────────────────────────────────────────────────────── */

  if (isSuccess) {
    return (
      <div className="cs-page">
        <nav className="dashboard-nav">
          <div className="nav-brand">
            <div className="nav-logo"><BookIcon /></div>
            <span className="nav-title">AI Study Planner</span>
          </div>
          <div className="nav-actions">
            <button className="logout-btn" onClick={handleLogout}>
              <LogOutIcon /> Sign Out
            </button>
          </div>
        </nav>
        <div className="cs-success-wrapper">
          <div className="cs-success-card">
            <div className="cs-success-icon">
              <CheckCircleIcon />
            </div>
            <h1 className="cs-success-title">Semester Created!</h1>
            <p className="cs-success-msg">
              <strong>{savedSemesterName}</strong> has been saved successfully.
            </p>
            <div className="cs-success-actions">
              <button
                className="cs-btn-primary"
                onClick={() => {
                  setSemesterName('');
                  setSubjects([makeSubject()]);
                  setErrors({});
                  setServerError('');
                  setIsSuccess(false);
                }}
              >
                <PlusIcon /> Create Another
              </button>
              <button
                className="cs-btn-ghost"
                onClick={() => navigate('/dashboard')}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Form view ───────────────────────────────────────────────────────────── */

  return (
    <div className="cs-page">
      {/* Nav — reuses dashboard nav classes */}
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <div className="nav-logo"><BookIcon /></div>
          <span className="nav-title">AI Study Planner</span>
        </div>
        <div className="nav-actions">
          <button
            className="cs-back-btn"
            onClick={() => navigate('/dashboard')}
            type="button"
          >
            <ArrowLeftIcon /> Dashboard
          </button>
          <button className="logout-btn" onClick={handleLogout} type="button">
            <LogOutIcon /> Sign Out
          </button>
        </div>
      </nav>

      <main className="cs-content">
        {/* Page heading */}
        <div className="cs-heading">
          <h1 className="cs-title">Create Semester</h1>
          <p className="cs-subtitle">
            Add a semester with its subjects and topics to build your study plan.
          </p>
        </div>

        {/* Server error */}
        {serverError && (
          <div className="alert alert-error cs-alert" role="alert">
            <AlertCircleIcon />
            <span>{serverError}</span>
          </div>
        )}

        <form className="cs-form" onSubmit={handleSubmit} noValidate>

          {/* ── Semester name ── */}
          <div className="cs-card">
            <div className="cs-card-header">
              <h2 className="cs-card-title">Semester Details</h2>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="semester-name">
                Semester Name / Number
              </label>
              <input
                id="semester-name"
                className={`form-input ${errors.semesterName ? 'input-error' : ''}`}
                type="text"
                placeholder="e.g. Semester 5, Fall 2026"
                value={semesterName}
                onChange={(e) => {
                  setSemesterName(e.target.value);
                  if (errors.semesterName) setErrors((p) => ({ ...p, semesterName: '' }));
                }}
                maxLength={100}
              />
              {errors.semesterName && (
                <span className="field-error" role="alert">{errors.semesterName}</span>
              )}
            </div>
          </div>

          {/* ── Subjects ── */}
          {errors.subjects && (
            <span className="field-error cs-subjects-error" role="alert">{errors.subjects}</span>
          )}

          {subjects.map((subject, si) => (
            <div className="cs-card cs-subject-card" key={subject.id}>
              {/* Subject card header */}
              <div className="cs-card-header">
                <h2 className="cs-card-title">Subject {si + 1}</h2>
                {subjects.length > 1 && (
                  <button
                    type="button"
                    className="cs-remove-btn"
                    onClick={() => removeSubject(subject.id)}
                    aria-label={`Remove subject ${si + 1}`}
                  >
                    <TrashIcon /> Remove
                  </button>
                )}
              </div>

              {/* Subject fields */}
              <div className="cs-subject-fields">
                {/* Name */}
                <div className="form-group">
                  <label className="form-label" htmlFor={`subject-name-${subject.id}`}>
                    Subject Name
                  </label>
                  <input
                    id={`subject-name-${subject.id}`}
                    className={`form-input ${errors[`subject_${si}_name`] ? 'input-error' : ''}`}
                    type="text"
                    placeholder="e.g. Design and Analysis of Algorithms"
                    value={subject.name}
                    onChange={(e) => {
                      updateSubject(subject.id, 'name', e.target.value);
                      if (errors[`subject_${si}_name`])
                        setErrors((p) => ({ ...p, [`subject_${si}_name`]: '' }));
                    }}
                    maxLength={200}
                  />
                  {errors[`subject_${si}_name`] && (
                    <span className="field-error" role="alert">{errors[`subject_${si}_name`]}</span>
                  )}
                </div>

                {/* Code + Credits row */}
                <div className="cs-two-col">
                  <div className="form-group">
                    <label className="form-label" htmlFor={`subject-code-${subject.id}`}>
                      Subject Code <span className="cs-optional">(optional)</span>
                    </label>
                    <input
                      id={`subject-code-${subject.id}`}
                      className="form-input"
                      type="text"
                      placeholder="e.g. CS301"
                      value={subject.code}
                      onChange={(e) => updateSubject(subject.id, 'code', e.target.value)}
                      maxLength={20}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor={`subject-credits-${subject.id}`}>
                      Credits
                    </label>
                    <input
                      id={`subject-credits-${subject.id}`}
                      className={`form-input ${errors[`subject_${si}_credits`] ? 'input-error' : ''}`}
                      type="number"
                      placeholder="e.g. 4"
                      value={subject.credits}
                      min="0.5"
                      max="20"
                      step="0.5"
                      onChange={(e) => {
                        updateSubject(subject.id, 'credits', e.target.value);
                        if (errors[`subject_${si}_credits`])
                          setErrors((p) => ({ ...p, [`subject_${si}_credits`]: '' }));
                      }}
                    />
                    {errors[`subject_${si}_credits`] && (
                      <span className="field-error" role="alert">{errors[`subject_${si}_credits`]}</span>
                    )}
                  </div>
                </div>

                {/* Topics */}
                <div className="cs-topics-section">
                  <div className="cs-topics-header">
                    <label className="form-label cs-topics-label">Topics</label>
                    <button
                      type="button"
                      className="cs-add-topic-btn"
                      onClick={() => addTopic(subject.id)}
                    >
                      <PlusIcon /> Add Topic
                    </button>
                  </div>

                  {errors[`subject_${si}_topics`] && (
                    <span className="field-error" role="alert">{errors[`subject_${si}_topics`]}</span>
                  )}

                  <div className="cs-topics-list">
                    {subject.topics.map((topic, ti) => (
                      <div className="cs-topic-row" key={topic.id}>
                        <span className="cs-topic-num">{ti + 1}</span>
                        <div className="cs-topic-input-wrap">
                          <input
                            className={`form-input cs-topic-input ${errors[`subject_${si}_topic_${ti}`] ? 'input-error' : ''}`}
                            type="text"
                            placeholder={`Topic ${ti + 1} name`}
                            value={topic.name}
                            onChange={(e) => {
                              updateTopic(subject.id, topic.id, e.target.value);
                              if (errors[`subject_${si}_topic_${ti}`])
                                setErrors((p) => ({ ...p, [`subject_${si}_topic_${ti}`]: '' }));
                            }}
                            maxLength={200}
                          />
                          {errors[`subject_${si}_topic_${ti}`] && (
                            <span className="field-error" role="alert">
                              {errors[`subject_${si}_topic_${ti}`]}
                            </span>
                          )}
                        </div>
                        {subject.topics.length > 1 && (
                          <button
                            type="button"
                            className="cs-remove-topic-btn"
                            onClick={() => removeTopic(subject.id, topic.id)}
                            aria-label={`Remove topic ${ti + 1}`}
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add subject button */}
          <button
            type="button"
            className="cs-add-subject-btn"
            onClick={addSubject}
          >
            <PlusIcon /> Add Subject
          </button>

          {/* Submit */}
          <div className="cs-form-footer">
            <button
              type="button"
              className="cs-btn-ghost"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cs-btn-primary"
              disabled={isSubmitting}
              id="create-semester-submit"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" />
                  Saving...
                </>
              ) : (
                'Create Semester'
              )}
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}
