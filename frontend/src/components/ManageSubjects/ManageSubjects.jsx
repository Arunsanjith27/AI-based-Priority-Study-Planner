import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './ManageSubjects.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const makeId = () => Math.random().toString(36).slice(2, 9);
const makeTopic = (name = '') => ({ id: makeId(), name });

/* ─── SVG Icons ──────────────────────────────────────────────────────────────── */
const BookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <line x1="12" y1="6" x2="12" y2="12" /><line x1="9" y1="9" x2="15" y2="9" />
  </svg>
);
const LogOutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const ArrowLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" /><path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/* ─── SubjectForm — used for both Add and Edit ───────────────────────────────── */
function SubjectForm({ initial, onSave, onCancel, saving, serverError }) {
  const [name, setName] = useState(initial?.name || '');
  const [code, setCode] = useState(initial?.code || '');
  const [credits, setCredits] = useState(initial?.credits !== undefined ? String(initial.credits) : '');
  const [topics, setTopics] = useState(
    initial?.topics?.length
      ? initial.topics.map((t) => makeTopic(t.name))
      : [makeTopic()]
  );
  const [errors, setErrors] = useState({});

  const validate = useCallback(() => {
    const e = {};
    if (!name.trim()) e.name = 'Subject name is required';
    const c = parseFloat(credits);
    if (credits === '') e.credits = 'Credits are required';
    else if (isNaN(c) || c < 0.5 || c > 20) e.credits = 'Credits must be between 0.5 and 20';
    if (topics.length === 0) e.topics = 'At least one topic is required';
    topics.forEach((t, i) => {
      if (!t.name.trim()) e[`topic_${i}`] = 'Topic name cannot be empty';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [name, credits, topics]);

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      name: name.trim(),
      code: code.trim(),
      credits: parseFloat(credits),
      topics: topics.map((t) => ({ name: t.name.trim() })),
    });
  };

  const addTopic = () => setTopics((p) => [...p, makeTopic()]);
  const removeTopic = (id) => setTopics((p) => p.filter((t) => t.id !== id));
  const updateTopic = (id, val) =>
    setTopics((p) => p.map((t) => (t.id === id ? { ...t, name: val } : t)));

  return (
    <div className="ms-form-panel">
      {serverError && (
        <div className="alert alert-error ms-alert" role="alert">
          <AlertCircleIcon /><span>{serverError}</span>
        </div>
      )}

      {/* Name */}
      <div className="form-group">
        <label className="form-label" htmlFor="sf-name">Subject Name</label>
        <input
          id="sf-name"
          className={`form-input ${errors.name ? 'input-error' : ''}`}
          type="text"
          placeholder="e.g. Design and Analysis of Algorithms"
          value={name}
          maxLength={200}
          onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: '' })); }}
        />
        {errors.name && <span className="field-error" role="alert">{errors.name}</span>}
      </div>

      {/* Code + Credits */}
      <div className="cs-two-col">
        <div className="form-group">
          <label className="form-label" htmlFor="sf-code">
            Subject Code <span className="cs-optional">(optional)</span>
          </label>
          <input
            id="sf-code"
            className="form-input"
            type="text"
            placeholder="e.g. CS301"
            value={code}
            maxLength={20}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="sf-credits">Credits</label>
          <input
            id="sf-credits"
            className={`form-input ${errors.credits ? 'input-error' : ''}`}
            type="number"
            placeholder="e.g. 4"
            value={credits}
            min="0.5" max="20" step="0.5"
            onChange={(e) => { setCredits(e.target.value); if (errors.credits) setErrors((p) => ({ ...p, credits: '' })); }}
          />
          {errors.credits && <span className="field-error" role="alert">{errors.credits}</span>}
        </div>
      </div>

      {/* Topics */}
      <div className="cs-topics-section">
        <div className="cs-topics-header">
          <label className="form-label cs-topics-label">Topics</label>
          <button type="button" className="cs-add-topic-btn" onClick={addTopic}>
            <PlusIcon /> Add Topic
          </button>
        </div>
        {errors.topics && <span className="field-error" role="alert">{errors.topics}</span>}
        <div className="cs-topics-list">
          {topics.map((topic, ti) => (
            <div className="cs-topic-row" key={topic.id}>
              <span className="cs-topic-num">{ti + 1}</span>
              <div className="cs-topic-input-wrap">
                <input
                  className={`form-input cs-topic-input ${errors[`topic_${ti}`] ? 'input-error' : ''}`}
                  type="text"
                  placeholder={`Topic ${ti + 1} name`}
                  value={topic.name}
                  maxLength={200}
                  onChange={(e) => {
                    updateTopic(topic.id, e.target.value);
                    if (errors[`topic_${ti}`]) setErrors((p) => ({ ...p, [`topic_${ti}`]: '' }));
                  }}
                />
                {errors[`topic_${ti}`] && (
                  <span className="field-error" role="alert">{errors[`topic_${ti}`]}</span>
                )}
              </div>
              {topics.length > 1 && (
                <button type="button" className="cs-remove-topic-btn" onClick={() => removeTopic(topic.id)} aria-label={`Remove topic ${ti + 1}`}>
                  <TrashIcon />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="ms-form-actions">
        <button type="button" className="cs-btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="button" className="cs-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <><span className="spinner" /> Saving...</> : <><CheckIcon /> Save Subject</>}
        </button>
      </div>
    </div>
  );
}

/* ─── ConfirmDialog ──────────────────────────────────────────────────────────── */
function ConfirmDialog({ subjectName, onConfirm, onCancel, deleting }) {
  return (
    <div className="ms-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="ms-dialog">
        <div className="ms-dialog-icon">
          <TrashIcon />
        </div>
        <h2 className="ms-dialog-title" id="confirm-title">Delete Subject?</h2>
        <p className="ms-dialog-body">
          Are you sure you want to delete{' '}
          <strong>&ldquo;{subjectName}&rdquo;</strong>?
          <br />
          This will also remove all its associated topics.
        </p>
        <div className="ms-dialog-actions">
          <button className="cs-btn-ghost" onClick={onCancel} disabled={deleting}>Cancel</button>
          <button className="ms-btn-danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? <><span className="spinner spinner-dark" /> Deleting...</> : <><TrashIcon /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export default function ManageSubjects() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // ── Auth guard ──
  useEffect(() => {
    if (!token) navigate('/login');
  }, [token, navigate]);

  // ── Data state ──
  const [semesters, setSemesters] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [semester, setSemester] = useState(null); // full semester object

  // ── UI state ──
  const [loadingSemesters, setLoadingSemesters] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [pageError, setPageError] = useState('');

  // ── Panel state: null | 'add' | { mode:'edit', subject }
  const [panel, setPanel] = useState(null);
  const [panelSaving, setPanelSaving] = useState(false);
  const [panelError, setPanelError] = useState('');

  // ── Delete confirm state ──
  const [deleteTarget, setDeleteTarget] = useState(null); // { _id, name }
  const [deleting, setDeleting] = useState(false);

  /* ── Fetch semester list on mount ───────────────────────────────────────── */
  useEffect(() => {
    if (!token) return;
    const fetchSemesters = async () => {
      try {
        const res = await fetch(`${API_BASE}/semesters`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) { localStorage.removeItem('token'); navigate('/login'); return; }
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setSemesters(data.data.semesters);
        if (data.data.semesters.length > 0) {
          setSelectedId(data.data.semesters[0]._id);
        }
      } catch {
        setPageError('Failed to load semesters. Please try again.');
      } finally {
        setLoadingSemesters(false);
      }
    };
    fetchSemesters();
  }, [token, navigate]);

  /* ── Fetch selected semester's subjects whenever selection changes ───────── */
  useEffect(() => {
    if (!selectedId || !token) { setSemester(null); return; }
    const fetchSemester = async () => {
      setLoadingSubjects(true);
      setPanel(null);
      setPanelError('');
      try {
        const res = await fetch(`${API_BASE}/semesters/${selectedId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) { localStorage.removeItem('token'); navigate('/login'); return; }
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setSemester(data.data.semester);
      } catch {
        setPageError('Failed to load subjects. Please try again.');
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSemester();
  }, [selectedId, token, navigate]);

  /* ── Add subject ─────────────────────────────────────────────────────────── */
  const handleAddSave = async (payload) => {
    setPanelSaving(true);
    setPanelError('');
    try {
      const res = await fetch(`${API_BASE}/semesters/${selectedId}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 401) { localStorage.removeItem('token'); navigate('/login'); return; }
      if (!res.ok) { setPanelError(data.message || 'Failed to add subject.'); return; }
      setSemester(data.data.semester);
      setPanel(null);
    } catch {
      setPanelError('Unable to connect to the server. Please try again.');
    } finally {
      setPanelSaving(false);
    }
  };

  /* ── Edit subject ────────────────────────────────────────────────────────── */
  const handleEditSave = async (payload) => {
    setPanelSaving(true);
    setPanelError('');
    try {
      const res = await fetch(
        `${API_BASE}/semesters/${selectedId}/subjects/${panel.subject._id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (res.status === 401) { localStorage.removeItem('token'); navigate('/login'); return; }
      if (!res.ok) { setPanelError(data.message || 'Failed to update subject.'); return; }
      setSemester(data.data.semester);
      setPanel(null);
    } catch {
      setPanelError('Unable to connect to the server. Please try again.');
    } finally {
      setPanelSaving(false);
    }
  };

  /* ── Delete subject ──────────────────────────────────────────────────────── */
  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      const res = await fetch(
        `${API_BASE}/semesters/${selectedId}/subjects/${deleteTarget._id}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.status === 401) { localStorage.removeItem('token'); navigate('/login'); return; }
      if (!res.ok) { setPageError(data.message || 'Failed to delete subject.'); setDeleteTarget(null); return; }
      setSemester(data.data.semester);
      setDeleteTarget(null);
    } catch {
      setPageError('Unable to connect to the server. Please try again.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('student');
    navigate('/login');
  };

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="ms-page">
      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <ConfirmDialog
          subjectName={deleteTarget.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}

      {/* Nav — reuses existing dashboard-nav classes */}
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <div className="nav-logo"><BookIcon /></div>
          <span className="nav-title">AI Study Planner</span>
        </div>
        <div className="nav-actions">
          <button className="cs-back-btn" onClick={() => navigate('/dashboard')} type="button">
            <ArrowLeftIcon /> Dashboard
          </button>
          <button className="logout-btn" onClick={handleLogout} type="button">
            <LogOutIcon /> Sign Out
          </button>
        </div>
      </nav>

      <main className="ms-content">
        {/* Heading */}
        <div className="cs-heading">
          <h1 className="cs-title">Manage Subjects</h1>
          <p className="cs-subtitle">Select a semester to view, add, edit or delete its subjects and topics.</p>
        </div>

        {/* Page-level error */}
        {pageError && (
          <div className="alert alert-error ms-alert" role="alert">
            <AlertCircleIcon /><span>{pageError}</span>
          </div>
        )}

        {/* Loading semesters */}
        {loadingSemesters && (
          <div className="ms-loading">
            <div className="loading-spinner" />
            <p>Loading semesters…</p>
          </div>
        )}

        {/* No semesters yet */}
        {!loadingSemesters && semesters.length === 0 && !pageError && (
          <div className="ms-empty-state">
            <p className="ms-empty-text">You have no semesters yet.</p>
            <button className="cs-btn-primary" onClick={() => navigate('/semester/create')}>
              <PlusIcon /> Create Semester
            </button>
          </div>
        )}

        {/* Semester selector */}
        {!loadingSemesters && semesters.length > 0 && (
          <>
            <div className="cs-card ms-selector-card">
              <div className="form-group">
                <label className="form-label" htmlFor="semester-select">Select Semester</label>
                <div className="ms-select-wrapper">
                  <select
                    id="semester-select"
                    className="ms-select"
                    value={selectedId}
                    onChange={(e) => { setSelectedId(e.target.value); setPanel(null); setPanelError(''); setPageError(''); }}
                  >
                    {semesters.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDownIcon />
                </div>
              </div>
            </div>

            {/* Subjects area */}
            {loadingSubjects && (
              <div className="ms-loading">
                <div className="loading-spinner" /><p>Loading subjects…</p>
              </div>
            )}

            {!loadingSubjects && semester && (
              <>
                {/* Subject list */}
                <div className="ms-subjects-section">
                  <div className="ms-subjects-header">
                    <h2 className="ms-subjects-title">
                      Subjects
                      <span className="ms-subjects-count">{semester.subjects.length}</span>
                    </h2>
                    {panel?.mode !== 'add' && (
                      <button
                        className="cs-btn-primary ms-add-btn"
                        type="button"
                        onClick={() => { setPanel({ mode: 'add' }); setPanelError(''); }}
                      >
                        <PlusIcon /> Add Subject
                      </button>
                    )}
                  </div>

                  {/* Add Subject form panel */}
                  {panel?.mode === 'add' && (
                    <div className="cs-card cs-subject-card ms-panel-card">
                      <div className="cs-card-header">
                        <h3 className="cs-card-title">Add Subject</h3>
                      </div>
                      <SubjectForm
                        initial={null}
                        onSave={handleAddSave}
                        onCancel={() => { setPanel(null); setPanelError(''); }}
                        saving={panelSaving}
                        serverError={panelError}
                      />
                    </div>
                  )}

                  {/* Empty subjects */}
                  {semester.subjects.length === 0 && panel?.mode !== 'add' && (
                    <div className="ms-empty-subjects">
                      <p>No subjects yet. Click <strong>Add Subject</strong> to get started.</p>
                    </div>
                  )}

                  {/* Subject cards */}
                  {semester.subjects.map((subject) => (
                    <div key={subject._id} className="cs-card cs-subject-card ms-subject-card">
                      {/* Edit form inline */}
                      {panel?.mode === 'edit' && panel.subject._id === subject._id ? (
                        <>
                          <div className="cs-card-header">
                            <h3 className="cs-card-title">Edit Subject</h3>
                          </div>
                          <SubjectForm
                            initial={subject}
                            onSave={handleEditSave}
                            onCancel={() => { setPanel(null); setPanelError(''); }}
                            saving={panelSaving}
                            serverError={panelError}
                          />
                        </>
                      ) : (
                        /* Subject view */
                        <>
                          <div className="ms-subject-top">
                            <div className="ms-subject-info">
                              <h3 className="ms-subject-name">{subject.name}</h3>
                              <div className="ms-subject-meta">
                                {subject.code && (
                                  <span className="ms-meta-badge ms-meta-code">{subject.code}</span>
                                )}
                                <span className="ms-meta-badge ms-meta-credits">
                                  {subject.credits} {subject.credits === 1 ? 'Credit' : 'Credits'}
                                </span>
                                <span className="ms-meta-badge ms-meta-topics">
                                  {subject.topics.length} {subject.topics.length === 1 ? 'Topic' : 'Topics'}
                                </span>
                              </div>
                            </div>
                            <div className="ms-subject-actions">
                              <button
                                className="ms-action-btn ms-action-edit"
                                type="button"
                                onClick={() => { setPanel({ mode: 'edit', subject }); setPanelError(''); }}
                                aria-label={`Edit ${subject.name}`}
                              >
                                <EditIcon /> Edit
                              </button>
                              <button
                                className="ms-action-btn ms-action-delete"
                                type="button"
                                onClick={() => setDeleteTarget({ _id: subject._id, name: subject.name })}
                                aria-label={`Delete ${subject.name}`}
                              >
                                <TrashIcon /> Delete
                              </button>
                            </div>
                          </div>

                          {/* Topics list */}
                          {subject.topics.length > 0 && (
                            <div className="ms-topics-list">
                              {subject.topics.map((topic) => (
                                <div key={topic._id} className="ms-topic-chip">
                                  <CheckIcon />
                                  <span>{topic.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
