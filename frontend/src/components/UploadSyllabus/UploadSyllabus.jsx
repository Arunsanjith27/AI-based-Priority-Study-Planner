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

            <div className="us-result-actions">
              <button
                className="cs-btn-primary"
                onClick={() => {
                  setResultSyllabus(null);
                  setFile(null);
                  setSubject('');
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
