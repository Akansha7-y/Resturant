import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

// Clean, lightweight SVG Icons (No external dependencies)
function MailIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function UserIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  );
}

function EyeIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 2 20 20" />
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    </svg>
  );
}

function ArrowLeftIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function CheckCircleIcon({ size = 18, color = '#34d399' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function AlertCircleIcon({ size = 18, color = '#f87171' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function SparklesIcon({ size = 16, color = 'hsl(var(--primary))' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

export default function Auth() {
  const { user, token, logout, login, register, sendOtp, verifyOtp, forgotPassword, resetPassword } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Main modes: 'login' | 'signup' | 'otp' | 'forgot'
  const [mode, setMode] = useState('login');

  // Sub-steps for OTP and Forgot Password flows
  const [otpStep, setOtpStep] = useState('request'); // 'request' | 'verify'
  const [resetStep, setResetStep] = useState('request'); // 'request' | 'verify'

  // Input States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [role, setRole] = useState('user'); // 'user' | 'owner'

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(null);
  const [devOtpCode, setDevOtpCode] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);

  const redirectPath = location.state?.from || '/';

  const navigateAfterAuth = (authUser) => {
    if (authUser?.role === 'owner') {
      navigate('/owner');
    } else if (authUser?.role === 'admin') {
      navigate('/');
    } else {
      navigate(redirectPath);
    }
  };

  const clearMessages = () => {
    setLocalError('');
    setInfoMessage('');
    setDevOtpCode('');
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    clearMessages();
    setOtpStep('request');
    setResetStep('request');
    setOtp('');
    setResetCode('');
    setDevOtpCode('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // 1-Click Instant Demo Login (Direct, Zero-Friction)
  const handleQuickDemo = async (demoType) => {
    clearMessages();
    setDemoLoading(demoType);

    let demoEmail = '';
    let demoPass = '';

    if (demoType === 'guest') {
      demoEmail = 'guest@gmail.com';
      demoPass = 'guest123';
    } else if (demoType === 'owner') {
      demoEmail = 'owner@etoile.com';
      demoPass = 'owner123';
    } else if (demoType === 'admin') {
      demoEmail = 'admin@etoile.com';
      demoPass = 'admin123';
    }

    setEmail(demoEmail);
    setPassword(demoPass);
    setMode('login');

    try {
      const loggedUser = await login(demoEmail, demoPass);
      navigateAfterAuth(loggedUser);
    } catch (err) {
      setLocalError(err.message || 'Demo access failed. Please try again.');
    } finally {
      setDemoLoading(null);
    }
  };

  // Email + Password Submit (Login or Sign Up)
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const loggedUser = await login(email.trim(), password);
        navigateAfterAuth(loggedUser);
      } else if (mode === 'signup') {
        if (!name.trim()) {
          setLocalError('Please enter your full name.');
          setSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setLocalError('Password must be at least 6 characters.');
          setSubmitting(false);
          return;
        }
        const registeredUser = await register(name.trim(), email.trim(), password, role);
        navigateAfterAuth(registeredUser);
      }
    } catch (err) {
      setLocalError(err.message || 'Authentication failed. Please verify your information.');
    } finally {
      setSubmitting(false);
    }
  };

  // OTP Login: Step 1 (Request Code)
  const handleSendOtp = async (e) => {
    e.preventDefault();
    clearMessages();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);

    try {
      const data = await sendOtp(cleanEmail);
      setIsNewUser(Boolean(data.isNewUser));
      setOtpStep('verify');
      setInfoMessage(data.message || `Access code sent to ${cleanEmail}`);
      if (data.devOtp) {
        setDevOtpCode(data.devOtp);
        setOtp(data.devOtp);
      }
    } catch (err) {
      setLocalError(err.message || 'Could not send access code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // OTP Login: Step 2 (Verify Code)
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearMessages();

    if (otp.trim().length !== 6) {
      setLocalError('Please enter the 6-digit access code.');
      return;
    }

    if (isNewUser && !name.trim()) {
      setLocalError('Please provide your name to complete registration.');
      return;
    }

    setSubmitting(true);

    try {
      const loggedUser = await verifyOtp(email.trim().toLowerCase(), otp.trim(), name.trim() || undefined);
      navigateAfterAuth(loggedUser);
    } catch (err) {
      setLocalError(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Forgot Password: Step 1 (Request Code)
  const handleSendResetCode = async (e) => {
    e.preventDefault();
    clearMessages();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setLocalError('Please enter your registered email address.');
      return;
    }

    setSubmitting(true);

    try {
      const data = await forgotPassword(cleanEmail);
      setResetStep('verify');
      setInfoMessage(data.message || `Recovery code sent to ${cleanEmail}`);
      if (data.devOtp) {
        setDevOtpCode(data.devOtp);
        setResetCode(data.devOtp);
      }
    } catch (err) {
      setLocalError(err.message || 'No registered account found with that email.');
    } finally {
      setSubmitting(false);
    }
  };

  // Forgot Password: Step 2 (Reset & Login)
  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessages();

    if (resetCode.trim().length !== 6) {
      setLocalError('Please enter the 6-digit recovery code.');
      return;
    }

    if (password.length < 6) {
      setLocalError('New password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const loggedUser = await resetPassword(email.trim().toLowerCase(), resetCode.trim(), password);
      setInfoMessage('Password successfully updated! Signing you in...');
      setTimeout(() => {
        navigateAfterAuth(loggedUser);
      }, 700);
    } catch (err) {
      setLocalError(err.message || 'Password reset failed. Please check the code.');
    } finally {
      setSubmitting(false);
    }
  };

  // If already logged in, show a clean, friendly account card
  if (token && user) {
    return (
      <div className="auth-page-wrapper">
        <div className="auth-ambient-glow" />
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={styles.brandBadge}>
              <SparklesIcon />
              <span>L'ÉTOILE RESERVE</span>
            </div>
            <h2 style={styles.title}>You are signed in</h2>
            <p style={styles.subtitle}>
              Currently active as <strong style={{ color: 'hsl(var(--text-gold))' }}>{user.name}</strong> ({user.email})
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => navigate(user.role === 'owner' ? '/owner' : '/dashboard')}
              className="btn btn-primary"
              style={{ width: '100%', padding: '13px' }}
            >
              Go to Dashboard →
            </button>
            <button
              onClick={logout}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '12px' }}
            >
              Sign out / Switch account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-wrapper">
      {/* Background ambient luxury glow */}
      <div className="auth-ambient-glow" />

      <div className="auth-card">
        {/* Brand Header */}
        <div style={styles.header}>
          <div style={styles.brandBadge}>
            <SparklesIcon />
            <span>L'ÉTOILE RESERVE</span>
          </div>

          <h1 style={styles.title}>
            {mode === 'login' && 'Welcome back'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'otp' && 'Sign in with code'}
            {mode === 'forgot' && 'Reset your password'}
          </h1>

          <p style={styles.subtitle}>
            {mode === 'login' && 'Enter your details to access your fine dining reservations'}
            {mode === 'signup' && 'Join in seconds to reserve tables at premier restaurants'}
            {mode === 'otp' && (otpStep === 'request' ? "Enter your email to receive an instant access code" : `Enter the 6-digit code sent to ${email}`)}
            {mode === 'forgot' && (resetStep === 'request' ? "Enter your email and we'll send a 6-digit recovery code" : `Enter the 6-digit code sent to ${email}`)}
          </p>
        </div>

        {/* Modern Segmented Pill Tabs for Login vs Sign Up */}
        {(mode === 'login' || mode === 'signup') && (
          <div style={styles.segmentedTabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => switchMode('login')}
              style={{
                ...styles.tabPill,
                ...(mode === 'login' ? styles.tabPillActive : {})
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              onClick={() => switchMode('signup')}
              style={{
                ...styles.tabPill,
                ...(mode === 'signup' ? styles.tabPillActive : {})
              }}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Back Link for OTP and Forgot flows */}
        {(mode === 'otp' || mode === 'forgot') && (
          <button
            type="button"
            onClick={() => switchMode('login')}
            style={styles.backBtn}
          >
            <ArrowLeftIcon />
            <span>Back to Sign In</span>
          </button>
        )}

        {/* Notification Alerts */}
        {localError && (
          <div style={styles.alertError}>
            <AlertCircleIcon />
            <span style={{ flex: 1 }}>{localError}</span>
            <button
              type="button"
              onClick={() => setLocalError('')}
              style={styles.alertCloseBtn}
              aria-label="Dismiss alert"
            >
              ✕
            </button>
          </div>
        )}

        {infoMessage && (
          <div style={styles.alertSuccess}>
            <CheckCircleIcon />
            <span style={{ flex: 1 }}>{infoMessage}</span>
            <button
              type="button"
              onClick={() => setInfoMessage('')}
              style={styles.alertCloseBtn}
              aria-label="Dismiss alert"
            >
              ✕
            </button>
          </div>
        )}

        {/* Auto-fill Chip for Test/Local OTP */}
        {devOtpCode && (
          <div style={styles.devOtpBanner}>
            <span>Test Mode Code: <strong>{devOtpCode}</strong></span>
            <button
              type="button"
              onClick={() => {
                if (mode === 'otp') setOtp(devOtpCode);
                if (mode === 'forgot') setResetCode(devOtpCode);
              }}
              style={styles.devOtpFillBtn}
            >
              Auto-fill Code
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 1 & 2: STANDARD LOGIN & SIGN UP (EMAIL + PASSWORD) */}
        {/* ======================================================== */}
        {(mode === 'login' || mode === 'signup') && (
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Full Name (Sign Up only) */}
            {mode === 'signup' && (
              <div style={styles.field}>
                <label style={styles.label}>Full Name</label>
                <div style={styles.inputWrapper}>
                  <div style={styles.inputIcon}><UserIcon /></div>
                  <input
                    type="text"
                    className="auth-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alexander Wright"
                    required
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div style={styles.field}>
              <label style={styles.label}>Email Address</label>
              <div style={styles.inputWrapper}>
                <div style={styles.inputIcon}><MailIcon /></div>
                <input
                  type="email"
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div style={styles.field}>
              <div style={styles.labelRow}>
                <label style={styles.label}>Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    style={styles.forgotLink}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div style={styles.inputWrapper}>
                <div style={styles.inputIcon}><LockIcon /></div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.passwordToggleBtn}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Role Picker for Sign Up (Clean segmented choice) */}
            {mode === 'signup' && (
              <div style={styles.field}>
                <label style={styles.label}>I am joining as</label>
                <div style={styles.rolePicker}>
                  <button
                    type="button"
                    onClick={() => setRole('user')}
                    style={{
                      ...styles.roleOption,
                      ...(role === 'user' ? styles.roleOptionActive : {})
                    }}
                  >
                    <span>🍽️</span>
                    <span>Dining Guest</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('owner')}
                    style={{
                      ...styles.roleOption,
                      ...(role === 'owner' ? styles.roleOptionActive : {})
                    }}
                  >
                    <span>🏪</span>
                    <span>Restaurant Partner</span>
                  </button>
                </div>
              </div>
            )}

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={styles.submitBtn}
            >
              {submitting ? (
                <span style={styles.loadingSpinner}>
                  <span style={styles.spinnerDot} />
                  {mode === 'login' ? 'Signing in...' : 'Creating profile...'}
                </span>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>

            {/* Alternative: OTP Sign In */}
            {mode === 'login' && (
              <>
                <div style={styles.divider}>
                  <span style={styles.dividerText}>or continue with</span>
                </div>

                <button
                  type="button"
                  onClick={() => switchMode('otp')}
                  className="auth-secondary-btn"
                >
                  <MailIcon size={16} />
                  <span>Sign in with Email Code (OTP)</span>
                </button>
              </>
            )}
          </form>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: ONE-TIME PASSWORD (OTP) LOGIN FLOW               */}
        {/* ======================================================== */}
        {mode === 'otp' && (
          otpStep === 'request' ? (
            <form onSubmit={handleSendOtp} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Your Email Address</label>
                <div style={styles.inputWrapper}>
                  <div style={styles.inputIcon}><MailIcon /></div>
                  <input
                    type="email"
                    className="auth-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={styles.submitBtn}
              >
                {submitting ? 'Sending Code...' : 'Send Access Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} style={styles.form}>
              <div style={styles.emailBadgeRow}>
                <span style={styles.sentToText}>Code sent to: <strong>{email}</strong></span>
                <button
                  type="button"
                  onClick={() => setOtpStep('request')}
                  style={styles.changeEmailBtn}
                >
                  Change
                </button>
              </div>

              {isNewUser && (
                <div style={styles.field}>
                  <label style={styles.label}>Your Full Name (First-Time Sign In)</label>
                  <div style={styles.inputWrapper}>
                    <div style={styles.inputIcon}><UserIcon /></div>
                    <input
                      type="text"
                      className="auth-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alexander Wright"
                      required
                    />
                  </div>
                </div>
              )}

              <div style={styles.field}>
                <label style={styles.label}>6-Digit Access Code</label>
                <input
                  type="text"
                  className="auth-otp-input"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={submitting || otp.length !== 6}
                className="btn btn-primary"
                style={styles.submitBtn}
              >
                {submitting ? 'Verifying...' : 'Verify & Sign In'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={submitting}
                  style={styles.resendLink}
                >
                  Didn't receive code? Resend
                </button>
              </div>
            </form>
          )
        )}

        {/* ======================================================== */}
        {/* VIEW 4: FORGOT & RESET PASSWORD FLOW                     */}
        {/* ======================================================== */}
        {mode === 'forgot' && (
          resetStep === 'request' ? (
            <form onSubmit={handleSendResetCode} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Registered Account Email</label>
                <div style={styles.inputWrapper}>
                  <div style={styles.inputIcon}><MailIcon /></div>
                  <input
                    type="email"
                    className="auth-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={styles.submitBtn}
              >
                {submitting ? 'Sending...' : 'Send Recovery Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} style={styles.form}>
              <div style={styles.emailBadgeRow}>
                <span style={styles.sentToText}>Resetting password for: <strong>{email}</strong></span>
                <button
                  type="button"
                  onClick={() => setResetStep('request')}
                  style={styles.changeEmailBtn}
                >
                  Change
                </button>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>6-Digit Recovery Code</label>
                <input
                  type="text"
                  className="auth-otp-input"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  required
                  autoFocus
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>New Password</label>
                <div style={styles.inputWrapper}>
                  <div style={styles.inputIcon}><LockIcon /></div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggleBtn}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Confirm New Password</label>
                <div style={styles.inputWrapper}>
                  <div style={styles.inputIcon}><LockIcon /></div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="auth-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.passwordToggleBtn}
                  >
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || resetCode.length !== 6 || !password || !confirmPassword}
                className="btn btn-primary"
                style={styles.submitBtn}
              >
                {submitting ? 'Updating Password...' : 'Save Password & Sign In'}
              </button>
            </form>
          )
        )}

        {/* ======================================================== */}
        {/* 1-CLICK INSTANT DEMO ACCESS (FAST ACCESS WITH 0 FRICTION) */}
        {/* ======================================================== */}
        <div style={styles.demoBar}>
          <div style={styles.demoHeader}>
            <span style={styles.demoHeaderIcon}>⚡</span>
            <span style={styles.demoHeaderText}>Instant 1-Click Access</span>
          </div>

          <div style={styles.demoPillsRow}>
            <button
              type="button"
              onClick={() => handleQuickDemo('guest')}
              disabled={Boolean(demoLoading)}
              className="auth-demo-pill"
            >
              <span>👤</span>
              <span>{demoLoading === 'guest' ? 'Entering...' : 'Guest'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('owner')}
              disabled={Boolean(demoLoading)}
              className="auth-demo-pill"
            >
              <span>🏪</span>
              <span>{demoLoading === 'owner' ? 'Entering...' : 'Owner'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('admin')}
              disabled={Boolean(demoLoading)}
              className="auth-demo-pill"
            >
              <span>🛡️</span>
              <span>{demoLoading === 'admin' ? 'Entering...' : 'Admin'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  brandBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '9999px',
    background: 'rgba(212, 175, 55, 0.1)',
    border: '1px solid rgba(212, 175, 55, 0.25)',
    color: 'hsl(var(--text-gold))',
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    marginBottom: '14px',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    fontFamily: "'Playfair Display', serif",
    color: '#ffffff',
    letterSpacing: '-0.01em',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '0.86rem',
    color: 'hsl(var(--text-muted))',
    lineHeight: '1.5',
    margin: '0 auto',
    maxWidth: '340px',
  },
  segmentedTabs: {
    display: 'flex',
    padding: '4px',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    marginBottom: '22px',
    gap: '4px',
  },
  tabPill: {
    flex: 1,
    padding: '9px 14px',
    borderRadius: '9px',
    border: 'none',
    background: 'transparent',
    color: 'hsl(var(--text-muted))',
    fontSize: '0.86rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    textAlign: 'center',
  },
  tabPillActive: {
    background: 'linear-gradient(135deg, hsl(var(--primary)), #d49a2a)',
    color: '#0c0e12',
    fontWeight: 600,
    boxShadow: '0 2px 10px rgba(212, 154, 42, 0.35)',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: 'none',
    color: 'hsl(var(--primary))',
    fontSize: '0.82rem',
    fontWeight: 500,
    cursor: 'pointer',
    padding: '0 0 16px 0',
    transition: 'opacity 0.2s ease',
  },
  alertError: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '12px',
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.28)',
    color: '#fca5a5',
    fontSize: '0.84rem',
    marginBottom: '18px',
    lineHeight: '1.4',
  },
  alertSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '12px',
    background: 'rgba(34, 197, 94, 0.12)',
    border: '1px solid rgba(34, 197, 94, 0.28)',
    color: '#86efac',
    fontSize: '0.84rem',
    marginBottom: '18px',
    lineHeight: '1.4',
  },
  alertCloseBtn: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    opacity: 0.7,
    padding: '2px',
    fontSize: '0.85rem',
  },
  devOtpBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderRadius: '10px',
    background: 'rgba(212, 175, 55, 0.1)',
    border: '1px dashed rgba(212, 175, 55, 0.35)',
    color: 'hsl(var(--text-gold))',
    fontSize: '0.8rem',
    marginBottom: '16px',
  },
  devOtpFillBtn: {
    background: 'rgba(212, 175, 55, 0.2)',
    border: '1px solid rgba(212, 175, 55, 0.4)',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '4px 10px',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'hsl(var(--text-muted))',
    letterSpacing: '0.3px',
  },
  forgotLink: {
    background: 'none',
    border: 'none',
    color: 'hsl(var(--primary))',
    fontSize: '0.78rem',
    fontWeight: 500,
    cursor: 'pointer',
    padding: 0,
    transition: 'opacity 0.2s',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: 'hsl(var(--text-muted))',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  passwordToggleBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: 'hsl(var(--text-muted))',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
    transition: 'color 0.2s ease',
  },
  emailBadgeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    fontSize: '0.8rem',
  },
  sentToText: {
    color: 'hsl(var(--text-muted))',
  },
  changeEmailBtn: {
    background: 'none',
    border: 'none',
    color: 'hsl(var(--primary))',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  rolePicker: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginTop: '2px',
  },
  roleOption: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 12px',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: 'hsl(var(--text-muted))',
    fontSize: '0.82rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  roleOptionActive: {
    background: 'rgba(212, 175, 55, 0.12)',
    border: '1px solid rgba(212, 175, 55, 0.4)',
    color: 'hsl(var(--text-gold))',
    fontWeight: 600,
  },
  submitBtn: {
    marginTop: '6px',
    width: '100%',
    padding: '13px',
    borderRadius: '12px',
    fontSize: '0.95rem',
    fontWeight: 600,
    letterSpacing: '0.3px',
  },
  loadingSpinner: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  spinnerDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#0c0e12',
    animation: 'pulseGold 1s infinite alternate',
  },
  divider: {
    position: 'relative',
    textAlign: 'center',
    margin: '10px 0 4px',
  },
  dividerText: {
    position: 'relative',
    background: 'rgba(18, 22, 28, 0.95)',
    padding: '0 12px',
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  resendLink: {
    background: 'none',
    border: 'none',
    color: 'hsl(var(--primary))',
    fontSize: '0.8rem',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  demoBar: {
    marginTop: '26px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  },
  demoHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    marginBottom: '10px',
  },
  demoHeaderIcon: {
    color: 'hsl(var(--primary))',
    fontSize: '0.85rem',
  },
  demoHeaderText: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'hsl(var(--text-muted))',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  demoPillsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
};
