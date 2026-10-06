import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Dashboard.css';

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

const LogOutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const TargetIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

/* ─── Component ─── */

export default function Dashboard() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/students/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('student');
            navigate('/login');
            return;
          }
          throw new Error('Failed to load dashboard');
        }

        const data = await response.json();
        setStudent(data.data.student);
      } catch (err) {
        setError('Unable to load dashboard. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('student');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="loading-spinner" />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const memberSince = student?.createdAt
    ? new Date(student.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  return (
    <div className="dashboard-page">
      {/* Navigation */}
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <div className="nav-logo">
            <BookIcon />
          </div>
          <span className="nav-title">AI Study Planner</span>
        </div>
        <div className="nav-actions">
          <span className="nav-greeting">
            Hi, <strong>{student?.name || 'Student'}</strong>
          </span>
          <button
            className="logout-btn"
            onClick={handleLogout}
            id="logout-btn"
          >
            <LogOutIcon />
            Sign Out
          </button>
        </div>
      </nav>

      {/* Dashboard content */}
      <main className="dashboard-content">
        <div className="dashboard-welcome">
          <h1 className="welcome-title">
            Welcome back, <span className="welcome-name">{student?.name?.split(' ')[0] || 'Student'}</span>! 👋
          </h1>
          <p className="welcome-subtitle">
            Here&apos;s your study planner overview. Stay focused and keep learning!
          </p>
        </div>

        {/* Student info card */}
        <div className="info-card" id="student-info-card">
          <div className="info-card-header">
            <h2 className="info-card-title">Your Profile</h2>
            <span className="info-badge">Active</span>
          </div>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Name</span>
              <span className="info-value" id="student-name">{student?.name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email</span>
              <span className="info-value" id="student-email">{student?.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Member Since</span>
              <span className="info-value">{memberSince}</span>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon stat-icon-blue">
              <CalendarIcon />
            </div>
            <div className="stat-content">
              <span className="stat-value">—</span>
              <span className="stat-label">Study Plans</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-purple">
              <TargetIcon />
            </div>
            <div className="stat-content">
              <span className="stat-value">—</span>
              <span className="stat-label">Goals Set</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-green">
              <TrendingUpIcon />
            </div>
            <div className="stat-content">
              <span className="stat-value">—</span>
              <span className="stat-label">Progress</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-amber">
              <ClockIcon />
            </div>
            <div className="stat-content">
              <span className="stat-value">—</span>
              <span className="stat-label">Study Hours</span>
            </div>
          </div>
        </div>

        <div className="coming-soon-card">
          <p className="coming-soon-text">
            🚀 More features coming soon — AI-powered study plans, and more!
          </p>
          <Link to="/semester/create" className="create-semester-btn" id="create-semester-btn">
            + Create Semester
          </Link>
        </div>
      </main>
    </div>
  );
}
