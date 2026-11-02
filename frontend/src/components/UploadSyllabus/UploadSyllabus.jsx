import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './UploadSyllabus.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/* ─── SVG Icons ─── */

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
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const UploadCloudIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    <polyline points="16 16 12 12 8 16" />
  </svg>
);

const FileTextIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
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

const SparklesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.6 4.6L18 9l-4.4 1.4L12 15l-1.6-4.6L6 9l4.4-1.4L12 3z" />
    <path d="M19 14l.8 2.3L22 17l-2.2.7L19 20l-.8-2.3L16 17l2.2-.7L19 14z" />
  </svg>
);

export default function UploadSyllabus() {
  const navigate = useNavigate();

  // Auth Guard
  const token = localStorage.getItem('token');
  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  // Form State
  const [subject, setSubject] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // UI State
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resultSyllabus, setResultSyllabus] = useState(null);
  const [copiedText, setCopiedText] = useState(false);

  // AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [selectedTopicIndexes, setSelectedTopicIndexes] = useState(() => new Set());
  const [editableSubject, setEditableSubject] = useState({
    name: '',
    code: '',
    credits: 3,
  });
  const [isApplying, setIsApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [applyError, setApplyError] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('student');
    navigate('/login');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      validateAndSetFile(selected);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setErrorMessage('');
    const allowedTypes = ['application/pdf', 'text/plain'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setErrorMessage('Unsupported file format. Please upload a PDF or TXT file.');
      setFile(null);
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds maximum limit of 10MB.');
      setFile(null);
      return;
    }
    setFile(selectedFile);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setResultSyllabus(null);

    if (!subject.trim()) {
      setErrorMessage('Subject name is required.');
      return;
    }

    if (!file) {
      setErrorMessage('Please select a syllabus file to upload.');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('subject', subject.trim());
      formData.append('syllabus', file);

      const response = await fetch(`${API_BASE}/syllabus/upload`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || 'Failed to upload syllabus.');
        return;
      }

      setResultSyllabus(data.syllabus);
    } catch {
      setErrorMessage('Unable to connect to the server. Please check your network and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyText = () => {
    if (resultSyllabus?.extractedText) {
      navigator.clipboard.writeText(resultSyllabus.extractedText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const resetAiState = () => {
    setAnalysis(null);
    setAnalysisError('');
    setSemesters([]);
    setSelectedSemesterId('');
    setSelectedTopicIndexes(new Set());
    setEditableSubject({ name: '', code: '', credits: 3 });
    setApplyMessage('');
    setApplyError('');
  };

  const fetchSemesters = async () => {
    try {
      const res = await fetch(`${API_BASE}/semesters`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      const data = await res.json();
      if (res.ok && data.data?.semesters) {
        setSemesters(data.data.semesters);
        if (data.data.semesters.length > 0) {
          setSelectedSemesterId(data.data.semesters[0]._id);
        }
      }
    } catch {
      // Non-fatal: the user can still read the analysis without applying it.
    }
  };

  const handleAnalyze = async () => {
    if (!resultSyllabus?._id) return;
    resetAiState();
    setIsAnalyzing(true);
    try {
      const res = await fetch(
        `${API_BASE}/syllabus/${resultSyllabus._id}/analyze`,
        {
          method: 'POST',
          headers: { Authorization: token ? `Bearer ${token}` : '' },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setAnalysisError(
          data.message || 'AI analysis could not be completed.'
        );
        return;
      }
      const a = data.data.analysis;
      setAnalysis(a);
      setEditableSubject({
        name: a.subjectName || '',
        code: a.code || '',
        credits: a.credits,
      });
      setSelectedTopicIndexes(new Set(a.topics.map((_, i) => i)));
      await fetchSemesters();
    } catch {
      setAnalysisError(
        'Unable to reach the server. Please check your network and try again.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleTopic = (index) => {
    setSelectedTopicIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleApplyToSemester = async () => {
    setApplyError('');
    setApplyMessage('');
    if (!analysis) return;
    if (!selectedSemesterId) {
      setApplyError('Please select a semester to add this subject to.');
      return;
    }
    const selectedTopics = analysis.topics
      .filter((_, i) => selectedTopicIndexes.has(i))
      .map((t) => ({ name: t.name }));
    if (selectedTopics.length === 0) {
      setApplyError('Select at least one topic to add.');
      return;
    }
    const name = editableSubject.name.trim();
    if (!name) {
      setApplyError('Subject name cannot be empty.');
      return;
    }
    setIsApplying(true);
    try {
      const res = await fetch(
        `${API_BASE}/semesters/${selectedSemesterId}/subjects`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({
            name,
            code: editableSubject.code.trim(),
            credits: Number(editableSubject.credits),
            topics: selectedTopics,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setApplyError(data.message || 'Could not add the subject.');
        return;
      }
      setApplyMessage(
        `Added "${name}" with ${selectedTopics.length} topic${
          selectedTopics.length === 1 ? '' : 's'
        } to the semester.`
      );
    } catch {
      setApplyError('Unable to reach the server. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="us-page">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <div className="nav-logo">
            <BookIcon />
          </div>
          <span className="nav-title">AI Study Planner</span>
        </div>
        <div className="nav-actions">
          <button
            className="cs-back-btn"
            onClick={() => navigate('/dashboard')}
            type="button"
            id="back-to-dashboard-btn"
          >
            <ArrowLeftIcon /> Dashboard
          </button>
          <button className="logout-btn" onClick={handleLogout} type="button">
            <LogOutIcon /> Sign Out
          </button>
        </div>
      </nav>

      <main className="us-content">
        <div className="us-heading">
          <h1 className="us-title">Upload Syllabus & Extract Text</h1>
          <p className="us-subtitle">
            Upload your course syllabus document (PDF or TXT) to automatically extract topic outlines.
          </p>
        </div>

        {errorMessage && (
          <div className="alert alert-error us-alert" role="alert" id="syllabus-error-msg">
            <AlertCircleIcon />
            <span>{errorMessage}</span>
          </div>
        )}

        {!resultSyllabus ? (
          <form className="us-form" onSubmit={handleSubmit} noValidate>
            <div className="us-card">
              <div className="us-card-header">
                <h2 className="us-card-title">Syllabus Details</h2>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="syllabus-subject">
                  Subject Name
                </label>
                <input
                  id="syllabus-subject"
                  className="form-input"
                  type="text"
                  placeholder="e.g. Operating Systems, Data Structures"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Syllabus File (PDF or TXT)</label>
                <div
                  className={`us-dropzone ${dragActive ? 'dropzone-active' : ''} ${file ? 'dropzone-has-file' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="syllabus-file-input"
                    className="us-file-input"
                    accept=".pdf,.txt,application/pdf,text/plain"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="syllabus-file-input" className="us-dropzone-label">
                    {file ? (
                      <div className="us-file-info">
                        <FileTextIcon />
                        <span className="us-file-name">{file.name}</span>
                        <span className="us-file-size">
                          ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>
                    ) : (
                      <div className="us-dropzone-prompt">
                        <UploadCloudIcon />
                        <p className="us-dropzone-text">
                          <strong>Click to upload</strong> or drag and drop your file here
                        </p>
                        <p className="us-dropzone-sub">Supported formats: PDF, TXT (Max 10MB)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>

            <div className="us-form-footer">
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
                disabled={isUploading}
                id="upload-syllabus-submit"
              >
                {isUploading ? (
                  <>
                    <span className="spinner" />
                    Extracting Text...
                  </>
                ) : (
                  'Upload & Extract Syllabus'
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="us-result-card">
            <div className="us-result-header">
              <div className="us-result-status">
                <CheckCircleIcon />
                <div>
                  <h2>Syllabus Uploaded & Extracted Successfully!</h2>
                  <p>Subject: <strong>{resultSyllabus.subject}</strong> | File: {resultSyllabus.originalFileName}</p>
                </div>
              </div>
              <button
                className="cs-btn-ghost"
                onClick={handleCopyText}
                type="button"
              >
                {copiedText ? 'Copied!' : 'Copy Text'}
              </button>
            </div>

            <div className="us-text-preview-container">
              <h3 className="us-preview-title">Extracted Syllabus Text:</h3>
              <pre className="us-extracted-text">{resultSyllabus.extractedText}</pre>
            </div>

            {/* AI Syllabus Analysis */}
            <div className="us-ai-panel">
              <div className="us-ai-panel-header">
                <div className="us-ai-sparkle">
                  <SparklesIcon />
                </div>
                <div>
                  <h3 className="us-ai-title">AI Syllabus Analysis</h3>
                  <p className="us-ai-subtitle">
                    Convert this syllabus into a structured subject outline using a
                    local AI model (Ollama). No external API, no cost.
                  </p>
                </div>
              </div>

              {!analysis && !isAnalyzing && !analysisError && (
                <button
                  type="button"
                  className="cs-btn-primary us-ai-analyze-btn"
                  onClick={handleAnalyze}
                  id="analyze-syllabus-btn"
                >
                  <SparklesIcon /> Analyze with AI
                </button>
              )}

              {isAnalyzing && (
                <div className="us-ai-loading">
                  <span className="spinner" />
                  <span>Analyzing syllabus with the local AI model…</span>
                </div>
              )}

              {analysisError && (
                <div className="alert alert-error us-alert" role="alert">
                  <AlertCircleIcon />
                  <span>{analysisError}</span>
                </div>
              )}

              {analysis && (
                <div className="us-ai-result">
                  <div className="us-ai-fields">
                    <div className="form-group">
                      <label className="form-label" htmlFor="ai-subject-name">
                        Subject name
                      </label>
                      <input
                        id="ai-subject-name"
                        className="form-input"
                        type="text"
                        maxLength={200}
                        value={editableSubject.name}
                        onChange={(e) =>
                          setEditableSubject((s) => ({ ...s, name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="form-group us-ai-field-code">
                      <label className="form-label" htmlFor="ai-subject-code">
                        Code
                      </label>
                      <input
                        id="ai-subject-code"
                        className="form-input"
                        type="text"
                        maxLength={20}
                        value={editableSubject.code}
                        onChange={(e) =>
                          setEditableSubject((s) => ({ ...s, code: e.target.value }))
                        }
                      />
                    </div>
                    <div className="form-group us-ai-field-credits">
                      <label className="form-label" htmlFor="ai-subject-credits">
                        Credits
                      </label>
                      <input
                        id="ai-subject-credits"
                        className="form-input"
                        type="number"
                        min={0.5}
                        max={20}
                        step={0.5}
                        value={editableSubject.credits}
                        onChange={(e) =>
                          setEditableSubject((s) => ({
                            ...s,
                            credits: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="us-ai-topics">
                    <div className="us-ai-topics-head">
                      <h4 className="us-ai-section-title">Suggested topics</h4>
                      <span className="us-ai-topic-count">
                        {selectedTopicIndexes.size}/{analysis.topics.length} selected
                      </span>
                    </div>
                    <div className="us-ai-topic-chips">
                      {analysis.topics.map((t, i) => {
                        const selected = selectedTopicIndexes.has(i);
                        return (
                          <button
                            key={`${t.name}-${i}`}
                            type="button"
                            className={`us-ai-topic-chip ${selected ? 'is-selected' : ''}`}
                            onClick={() => toggleTopic(i)}
                          >
                            <span className="us-ai-chip-check">
                              {selected ? '✓' : ''}
                            </span>
                            {t.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="us-ai-apply">
                    <div className="form-group us-ai-semester-field">
                      <label className="form-label" htmlFor="ai-semester-select">
                        Add to semester
                      </label>
                      <select
                        id="ai-semester-select"
                        className="form-input"
                        value={selectedSemesterId}
                        onChange={(e) => setSelectedSemesterId(e.target.value)}
                      >
                        {semesters.length === 0 && (
                          <option value="">No semesters yet — create one first</option>
                        )}
                        {semesters.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      className="cs-btn-primary us-ai-apply-btn"
                      disabled={isApplying || semesters.length === 0}
                      onClick={handleApplyToSemester}
                      id="apply-to-semester-btn"
                    >
                      {isApplying ? (
                        <>
                          <span className="spinner" /> Adding…
                        </>
                      ) : (
                        'Add to Semester'
                      )}
                    </button>
                  </div>

                  {applyError && (
                    <div className="alert alert-error us-alert" role="alert">
                      <AlertCircleIcon />
                      <span>{applyError}</span>
                    </div>
                  )}
                  {applyMessage && (
                    <div className="alert alert-success us-alert" role="status">
                      <CheckCircleIcon />
                      <span>{applyMessage}</span>
                      <button
                        type="button"
                        className="cs-btn-ghost us-ai-manage-link"
                        onClick={() => navigate('/subjects/manage')}
                      >
                        Manage subjects
                      </button>
                    </div>
                  )}

                  <p className="us-ai-meta">
                    Analyzed with <strong>{analysis.model}</strong> ·{' '}
                    {analysis.topics.length} topics detected
                  </p>
                </div>
              )}
            </div>

            <div className="us-result-actions">
              <button
                className="cs-btn-primary"
                onClick={() => {
                  setResultSyllabus(null);
                  setFile(null);
                  setSubject('');
                  resetAiState();
                }}
              >
                Upload Another Syllabus
              </button>
              <button
                className="cs-btn-ghost"
                onClick={() => navigate('/dashboard')}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
