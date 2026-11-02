import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './ReviewAnalysis.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/* ─── SVG icons (inline, matches existing app style) ──────────────────────── */
const BookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <line x1="12" y1="6" x2="12" y2="12" />
    <line x1="9" y1="9" x2="15" y2="9" />
  </svg>
);
const ArrowLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);
const LogOutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const SparklesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.6 4.6L18 9l-4.4 1.4L12 15l-1.6-4.6L6 9l4.4-1.4L12 3z" />
    <path d="M19 14l.8 2.3L22 17l-2.2.7L19 20l-.8-2.3L16 17l2.2-.7L19 14z" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const XCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

/* ─── component ────────────────────────────────────────────────────────────── */
export default function ReviewAnalysis() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const token     = localStorage.getItem('token');

  // auth guard
  useEffect(() => { if (!token) navigate('/login'); }, [token, navigate]);

  // ── page state ──────────────────────────────────────────────────────────────
  const [loading,      setLoading]      = useState(true);
  const [pageError,    setPageError]    = useState('');
  const [syllabus,     setSyllabus]     = useState(null);

  // ── analyze state ───────────────────────────────────────────────────────────
  const [isAnalyzing,  setIsAnalyzing]  = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');

  // ── editable review fields ──────────────────────────────────────────────────
  const [editName,    setEditName]    = useState('');
  const [editCode,    setEditCode]    = useState('');
  const [editCredits, setEditCredits] = useState(3);
  const [topics,      setTopics]      = useState([]); // [{name, included}]

  // ── review submit state ─────────────────────────────────────────────────────
  const [feedback,       setFeedback]       = useState('');
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [reviewError,    setReviewError]    = useState('');
  const [reviewSuccess,  setReviewSuccess]  = useState('');

  // ── apply-to-semester state ─────────────────────────────────────────────────
  const [semesters,          setSemesters]          = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [isApplying,         setIsApplying]         = useState(false);
  const [applyError,         setApplyError]         = useState('');
  const [applySuccess,       setApplySuccess]       = useState('');

  /* ── helpers ─────────────────────────────────────────────────────────────── */
  const authHeader = useCallback(
    () => ({ Authorization: token ? `Bearer ${token}` : '' }),
    [token]
  );

  const hydrateAnalysis = useCallback((s) => {
    if (s?.aiAnalysis) {
      setEditName(s.aiAnalysis.subjectName  || '');
      setEditCode(s.aiAnalysis.code         || '');
      setEditCredits(s.aiAnalysis.credits   ?? 3);
      setTopics(s.aiAnalysis.topics.map(t => ({ name: t.name, included: t.included ?? true })));
    } else {
      setTopics([]);
    }
  }, []);

  /* ── load syllabus ───────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!id || !token) return;
    (async () => {
      try {
        const res  = await fetch(`${API_BASE}/syllabus/${id}`, { headers: authHeader() });
        const data = await res.json();
        if (!res.ok) {
          setPageError(data.message || 'Could not load syllabus.');
          return;
        }
        setSyllabus(data.data.syllabus);
        hydrateAnalysis(data.data.syllabus);
      } catch {
        setPageError('Unable to connect to the server.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token, authHeader, hydrateAnalysis]);

  /* ── fetch semesters for the apply dropdown ──────────────────────────────── */
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res  = await fetch(`${API_BASE}/semesters`, { headers: authHeader() });
        const data = await res.json();
        if (res.ok && data.data?.semesters) {
          setSemesters(data.data.semesters);
          if (data.data.semesters.length > 0) setSelectedSemesterId(data.data.semesters[0]._id);
        }
      } catch { /* non-fatal */ }
    })();
  }, [token, authHeader]);

  /* ── run AI analysis ─────────────────────────────────────────────────────── */
  const handleAnalyze = async () => {
    setAnalyzeError('');
    setIsAnalyzing(true);
    try {
      const res  = await fetch(`${API_BASE}/syllabus/${id}/analyze`, {
        method: 'POST', headers: authHeader(),
      });
      const data = await res.json();
      if (!res.ok) { setAnalyzeError(data.message || 'Analysis failed.'); return; }
      setSyllabus(data.data.syllabus);
      hydrateAnalysis(data.data.syllabus);
    } catch {
      setAnalyzeError('Unable to connect to the server.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  /* ── toggle topic inclusion ──────────────────────────────────────────────── */
  const toggleTopic = (index) =>
    setTopics(prev => prev.map((t, i) => i === index ? { ...t, included: !t.included } : t));

  const selectedCount = topics.filter(t => t.included).length;

  /* ── submit review ───────────────────────────────────────────────────────── */
  const handleReview = async (decision) => {
    setReviewError('');
    setReviewSuccess('');
    if (decision === 'approved' && !editName.trim()) {
      setReviewError('Subject name cannot be empty.');
      return;
    }
    setIsSubmitting(true);
    try {
      const body = { decision, feedback };
      if (decision === 'approved') {
        body.subjectName = editName.trim();
        body.code        = editCode.trim();
        body.credits     = Number(editCredits);
        body.topics      = topics;
      }
      const res  = await fetch(`${API_BASE}/syllabus/${id}/review`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setReviewError(data.message || 'Could not save review.'); return; }
      setSyllabus(data.data.syllabus);
      hydrateAnalysis(data.data.syllabus);
      setReviewSuccess(decision === 'approved' ? 'Analysis approved.' : 'Analysis rejected.');
    } catch {
      setReviewError('Unable to connect to the server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── apply approved analysis to semester ─────────────────────────────────── */
  const handleApplyToSemester = async () => {
    setApplyError('');
    setApplySuccess('');
    if (!selectedSemesterId) { setApplyError('Select a semester.'); return; }
    const selectedTopics = topics.filter(t => t.included).map(t => ({ name: t.name }));
    if (selectedTopics.length === 0) { setApplyError('Select at least one topic.'); return; }
    const name = editName.trim();
    if (!name) { setApplyError('Subject name cannot be empty.'); return; }
    setIsApplying(true);
    try {
      const res  = await fetch(`${API_BASE}/semesters/${selectedSemesterId}/subjects`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body:    JSON.stringify({
          name,
          code:    editCode.trim(),
          credits: Number(editCredits),
          topics:  selectedTopics,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setApplyError(data.message || 'Could not add subject.'); return; }
      setApplySuccess(
        `Added "${name}" with ${selectedTopics.length} topic${selectedTopics.length === 1 ? '' : 's'} to the semester.`
      );
    } catch {
      setApplyError('Unable to connect to the server.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('student');
    navigate('/login');
  };

  /* ── badge helpers ───────────────────────────────────────────────────────── */
  const reviewBadgeClass = {
    pending:  'ra-badge-pending',
    approved: 'ra-badge-approved',
    rejected: 'ra-badge-rejected',
  };

  /* ── render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="ra-page">
      {/* nav */}
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <div className="nav-logo"><BookIcon /></div>
          <span className="nav-title">AI Study Planner</span>
        </div>
        <div className="nav-actions">
          <button className="cs-back-btn" type="button" onClick={() => navigate('/syllabus/upload')}>
            <ArrowLeftIcon /> Upload Syllabus
          </button>
          <button className="logout-btn" type="button" onClick={handleLogout}>
            <LogOutIcon /> Sign Out
          </button>
        </div>
      </nav>

      <main className="ra-content">
        {/* heading */}
        <div className="ra-heading">
          <div className="ra-heading-icon"><SparklesIcon /></div>
          <div>
            <h1 className="ra-title">Review AI Analysis</h1>
            <p className="ra-subtitle">
              Review the AI-suggested subject outline, adjust topics, then approve or reject.
            </p>
          </div>
        </div>

        {/* loading / page error */}
        {loading && <div className="ra-loading"><span className="spinner" /> Loading syllabus…</div>}

        {pageError && (
          <div className="alert alert-error ra-alert" role="alert">
            <AlertCircleIcon /><span>{pageError}</span>
          </div>
        )}

        {!loading && !pageError && syllabus && (
          <>
            {/* syllabus meta card */}
            <div className="ra-meta-card">
              <div className="ra-meta-row">
                <span className="ra-meta-label">Subject</span>
                <span className="ra-meta-value">{syllabus.subject}</span>
              </div>
              <div className="ra-meta-row">
                <span className="ra-meta-label">File</span>
                <span className="ra-meta-value">{syllabus.originalFileName}</span>
              </div>
              <div className="ra-meta-row">
                <span className="ra-meta-label">Review status</span>
                <span className={`ra-badge ${reviewBadgeClass[syllabus.reviewStatus] || ''}`}>
                  {syllabus.reviewStatus}
                </span>
              </div>
              {syllabus.aiAnalysis && (
                <div className="ra-meta-row">
                  <span className="ra-meta-label">Model</span>
                  <span className="ra-meta-value">{syllabus.aiAnalysis.model}</span>
                </div>
              )}
            </div>

            {/* analyze trigger */}
            {!syllabus.aiAnalysis && (
              <div className="ra-card">
                <p className="ra-card-hint">
                  No analysis yet. Run the AI model to generate a subject outline from the extracted text.
                </p>
                {analyzeError && (
                  <div className="alert alert-error ra-alert" role="alert">
                    <AlertCircleIcon /><span>{analyzeError}</span>
                  </div>
                )}
                <button
                  type="button"
                  className="cs-btn-primary ra-analyze-btn"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  id="run-analysis-btn"
                >
                  {isAnalyzing ? <><span className="spinner" /> Analyzing…</> : <><SparklesIcon /> Run AI Analysis</>}
                </button>
              </div>
            )}

            {/* re-analyze (already has analysis) */}
            {syllabus.aiAnalysis && (
              <div className="ra-reanalyze-row">
                {analyzeError && (
                  <div className="alert alert-error ra-alert ra-alert-inline" role="alert">
                    <AlertCircleIcon /><span>{analyzeError}</span>
                  </div>
                )}
                <button
                  type="button"
                  className="cs-btn-ghost ra-reanalyze-btn"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  id="rerun-analysis-btn"
                >
                  {isAnalyzing ? <><span className="spinner" /> Re-analyzing…</> : <><SparklesIcon /> Re-run Analysis</>}
                </button>
              </div>
            )}

            {/* review panel */}
            {syllabus.aiAnalysis && (
              <div className="ra-card">
                <h2 className="ra-card-title">AI-Suggested Outline</h2>

                {/* editable fields */}
                <div className="ra-fields">
                  <div className="form-group">
                    <label className="form-label" htmlFor="ra-subject-name">Subject name</label>
                    <input
                      id="ra-subject-name"
                      className="form-input"
                      type="text"
                      maxLength={200}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                    />
                  </div>
                  <div className="form-group ra-field-code">
                    <label className="form-label" htmlFor="ra-code">Code</label>
                    <input
                      id="ra-code"
                      className="form-input"
                      type="text"
                      maxLength={20}
                      value={editCode}
                      onChange={e => setEditCode(e.target.value)}
                    />
                  </div>
                  <div className="form-group ra-field-credits">
                    <label className="form-label" htmlFor="ra-credits">Credits</label>
                    <input
                      id="ra-credits"
                      className="form-input"
                      type="number"
                      min={0.5}
                      max={20}
                      step={0.5}
                      value={editCredits}
                      onChange={e => setEditCredits(e.target.value)}
                    />
                  </div>
                </div>

                {/* topics */}
                <div className="ra-topics-section">
                  <div className="ra-topics-head">
                    <h3 className="ra-topics-title">Topics</h3>
                    <span className="ra-topics-count">
                      {selectedCount} / {topics.length} selected
                    </span>
                  </div>
                  <div className="ra-topic-chips">
                    {topics.map((t, i) => (
                      <button
                        key={`${t.name}-${i}`}
                        type="button"
                        className={`ra-topic-chip ${t.included ? 'is-selected' : ''}`}
                        onClick={() => toggleTopic(i)}
                        title={t.included ? 'Click to deselect' : 'Click to include'}
                      >
                        <span className="ra-chip-icon">
                          {t.included ? <CheckCircleIcon /> : <XCircleIcon />}
                        </span>
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* feedback */}
                <div className="form-group ra-feedback-group">
                  <label className="form-label" htmlFor="ra-feedback">
                    Feedback <span className="ra-optional">(optional)</span>
                  </label>
                  <textarea
                    id="ra-feedback"
                    className="form-input ra-textarea"
                    rows={3}
                    maxLength={1000}
                    placeholder="Notes about this analysis…"
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                  />
                </div>

                {/* review errors / success */}
                {reviewError && (
                  <div className="alert alert-error ra-alert" role="alert">
                    <AlertCircleIcon /><span>{reviewError}</span>
                  </div>
                )}
                {reviewSuccess && (
                  <div className="alert alert-success ra-alert" role="status">
                    <CheckCircleIcon /><span>{reviewSuccess}</span>
                  </div>
                )}

                {/* approve / reject buttons */}
                <div className="ra-decision-row">
                  <button
                    type="button"
                    className="cs-btn-primary ra-approve-btn"
                    disabled={isSubmitting}
                    onClick={() => handleReview('approved')}
                    id="approve-analysis-btn"
                  >
                    {isSubmitting ? <><span className="spinner" /> Saving…</> : <><CheckCircleIcon /> Approve</>}
                  </button>
                  <button
                    type="button"
                    className="ra-reject-btn"
                    disabled={isSubmitting}
                    onClick={() => handleReview('rejected')}
                    id="reject-analysis-btn"
                  >
                    <XCircleIcon /> Reject
                  </button>
                </div>
              </div>
            )}

            {/* apply to semester — only when approved */}
            {syllabus.aiAnalysis && syllabus.reviewStatus === 'approved' && (
              <div className="ra-card ra-apply-card">
                <h2 className="ra-card-title">Add to Semester</h2>
                <p className="ra-card-hint">
                  Push the approved subject outline directly into one of your semesters.
                </p>

                <div className="ra-apply-row">
                  <div className="form-group ra-semester-field">
                    <label className="form-label" htmlFor="ra-semester-select">Semester</label>
                    <select
                      id="ra-semester-select"
                      className="form-input"
                      value={selectedSemesterId}
                      onChange={e => setSelectedSemesterId(e.target.value)}
                    >
                      {semesters.length === 0 && (
                        <option value="">No semesters yet — create one first</option>
                      )}
                      {semesters.map(s => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="cs-btn-primary ra-apply-btn"
                    disabled={isApplying || semesters.length === 0}
                    onClick={handleApplyToSemester}
                    id="apply-to-semester-btn"
                  >
                    {isApplying ? <><span className="spinner" /> Adding…</> : 'Add to Semester'}
                  </button>
                </div>

                {applyError && (
                  <div className="alert alert-error ra-alert" role="alert">
                    <AlertCircleIcon /><span>{applyError}</span>
                  </div>
                )}
                {applySuccess && (
                  <div className="alert alert-success ra-alert" role="status">
                    <CheckCircleIcon />
                    <span>{applySuccess}</span>
                    <button
                      type="button"
                      className="cs-btn-ghost ra-manage-link"
                      onClick={() => navigate('/subjects/manage')}
                    >
                      Manage subjects
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
