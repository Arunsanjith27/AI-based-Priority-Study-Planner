import { useState, useCallback } from 'react';
import './Register.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Password requirements — kept in sync with backend validation
 */
const PASSWORD_RULES = [
  { key: 'length', label: '8+ characters', test: (v) => v.length >= 8 },
  { key: 'upper', label: 'Uppercase', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', label: 'Lowercase', test: (v) => /[a-z]/.test(v) },
  { key: 'digit', label: 'A digit', test: (v) => /[0-9]/.test(v) },
  { key: 'special', label: 'Special char', test: (v) => /[!@#$%^&*()_+\-=[\]{}|;:',.<>?/`~]/.test(v) },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ─── SVG Icons ─── */

const BookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <line x1="12" y1="6" x2="12" y2="12" />
    <line x1="9" y1="9" x2="15" y2="9" />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const CheckSmallIcon = () => (
  <svg className="requirement-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XSmallIcon = () => (
  <svg className="requirement-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8" opacity="0.4" />
  </svg>
);

/* ─── Component ─── */

export default function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  /* --- Client-side validation --- */

  const validateField = useCallback((field, value) => {
    switch (field) {
      case 'name': {
        const trimmed = value.trim();
        if (!trimmed) return 'Name is required';
        if (trimmed.length < 2) return 'Name must be at least 2 characters';
        if (trimmed.length > 100) return 'Name must not exceed 100 characters';
        return '';
      }
      case 'email': {
        const trimmed = value.trim();
        if (!trimmed) return 'Email is required';
        if (!EMAIL_REGEX.test(trimmed)) return 'Please enter a valid email address';
        if (trimmed.length > 255) return 'Email must not exceed 255 characters';
        return '';
      }
      case 'password': {
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (value.length > 128) return 'Password must not exceed 128 characters';
        if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
        if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
        if (!/[0-9]/.test(value)) return 'Password must contain at least one digit';
        if (!/[!@#$%^&*()_+\-=[\]{}|;:',.<>?/`~]/.test(value)) return 'Password must contain at least one special character';
        return '';
      }
      default:
        return '';
    }
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    for (const field of ['name', 'email', 'password']) {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [formData, validateField]);

  /* --- Handlers --- */

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) setServerError('');
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/students/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Map server field errors back to form
        if (data.errors && Array.isArray(data.errors)) {
          const fieldErrors = {};
          data.errors.forEach((err) => {
            if (err.field) fieldErrors[err.field] = err.message;
          });

          if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
          }
        }

        setServerError(data.message || 'Registration failed. Please try again.');
        return;
      }

      // Registration successful
      setRegisteredEmail(formData.email.trim());
      setIsSuccess(true);
    } catch (err) {
      setServerError('Unable to connect to the server. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* --- Success view --- */

  if (isSuccess) {
    return (
      <div className="register-page">
        <div className="register-card">
          <div className="success-content">
            <div className="success-icon-wrapper">
              <CheckCircleIcon />
            </div>
            <h1 className="success-title">Account Created!</h1>
            <p className="success-message">
              Your study planner account has been created successfully.
              <br />
              Welcome aboard, <span className="success-email">{registeredEmail}</span>!
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* --- Registration form view --- */

  return (
    <div className="register-page">
      <div className="register-card">
        {/* Header */}
        <div className="register-header">
          <div className="register-logo">
            <BookIcon />
          </div>
          <h1 className="register-title">Create Your Account</h1>
          <p className="register-subtitle">
            Start organizing your studies with AI-powered planning
          </p>
        </div>

        {/* Server error */}
        {serverError && (
          <div className="alert alert-error" role="alert" id="server-error-alert">
            <AlertCircleIcon />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form */}
        <form className="register-form" onSubmit={handleSubmit} noValidate>
          {/* Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="register-name">
              <UserIcon /> Student Name
            </label>
            <div className="input-wrapper">
              <input
                id="register-name"
                className={`form-input ${errors.name ? 'input-error' : ''}`}
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="name"
                maxLength={100}
              />
            </div>
            {errors.name && (
              <span className="field-error" id="name-error" role="alert">{errors.name}</span>
            )}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="register-email">
              <MailIcon /> Email Address
            </label>
            <div className="input-wrapper">
              <input
                id="register-email"
                className={`form-input ${errors.email ? 'input-error' : ''}`}
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="email"
                maxLength={255}
              />
            </div>
            {errors.email && (
              <span className="field-error" id="email-error" role="alert">{errors.email}</span>
            )}
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="register-password">
              <LockIcon /> Password
            </label>
            <div className="input-wrapper">
              <input
                id="register-password"
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Create a secure password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="new-password"
                maxLength={128}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                id="toggle-password-visibility"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.password && (
              <span className="field-error" id="password-error" role="alert">{errors.password}</span>
            )}

            {/* Password strength hints */}
            {formData.password.length > 0 && (
              <div className="password-requirements" id="password-requirements">
                {PASSWORD_RULES.map((rule) => {
                  const met = rule.test(formData.password);
                  return (
                    <span key={rule.key} className={`requirement ${met ? 'met' : ''}`}>
                      {met ? <CheckSmallIcon /> : <XSmallIcon />}
                      {rule.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="register-btn"
            disabled={isSubmitting}
            id="register-submit-btn"
          >
            {isSubmitting ? (
              <>
                <span className="spinner" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="register-footer">
          Already have an account? <a href="/login">Sign in</a>
        </div>
      </div>
    </div>
  );
}
