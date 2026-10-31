import { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageSkeleton } from '../../components/ui/Skeleton';
import { api } from '../../config/api';
import { getInitialsAvatar } from '../../utils/avatar';
import { initiateGoogleOAuthPKCE, handleGoogleCallbackPKCE } from '../../utils/oauth';
import { isFeatureEnabled } from '../../config/features';

// Root.tsx falls back to the literal "not-configured" for GoogleOAuthProvider.
// Treat it as unset here too — rendering the button with that placeholder sent
// users to Google's "invalid client" page with no in-app explanation.
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
const GOOGLE_AUTH_ENABLED =
  isFeatureEnabled('googleOAuth') &&
  GOOGLE_CLIENT_ID.length > 0 &&
  GOOGLE_CLIENT_ID !== 'not-configured';

export { getInitialsAvatar };

export const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpInfo, setOtpInfo] = useState('');

  const validateSignup = (usernameVal: string, emailVal: string, passwordVal: string): string | null => {
    const trimmedUsername = usernameVal.trim();
    const trimmedEmail = emailVal.trim();
    if (!trimmedUsername || trimmedUsername.length < 3) {
      return "Username must be at least 3 characters.";
    }
    if (!trimmedUsername || !/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      return "Username may only contain letters, numbers, and underscores.";
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return "Please enter a valid email address.";
    }
    if (!passwordVal || passwordVal.length < 8) {
      return "Password must be at least 8 characters.";
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordVal)) {
      return "Password must include at least one uppercase letter, lowercase letter, and number.";
    }
    return null;
  };  const navigate = useNavigate();
  const { checkAuth, isAuthenticated, isLoading: authLoading } = useAuth();

  // Handle Google OAuth callback on mount
  useEffect(() => {
    const result = handleGoogleCallbackPKCE();
    if (result) {
      (async () => {
        try {
          await api.post("/auth/google/callback", {
            code: result.code,
            code_verifier: result.codeVerifier,
            redirect_uri: `${window.location.origin}/signup`,
          });
          await checkAuth();
          navigate("/");
        } catch (err: any) {
          setError(err.response?.data?.message || "Google Signup failed");
        }
      })();
    }
  }, [checkAuth, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const validationError = validateSignup(username, email, password);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      setLoading(true);
      setError('');
      setOtpSent(true);
      setOtpError('');
      setOtpInfo('');
      setOtpCode('');
      await api.post(`/auth/signup`, {
        username: trimmedUsername,
        email: trimmedEmail,
        password,
        avatarUrl: getInitialsAvatar(trimmedUsername)
      });
      // Signup endpoint now sends the OTP email internally; no need for a
      // separate /auth/otp/send call.
      setOtpInfo(`A verification code was sent to ${email}.`);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Registration failed";
      // On ANY error, keep the user on the signup form so they can correct
      // their input or retry. Only a successful 200 response advances to
      // the OTP verification step.
      setOtpSent(false);
      setOtpCode('');
      setOtpError('');
      setOtpInfo('');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setOtpError("Please enter a 6-digit code.");
      return;
    }
    try {
      setOtpLoading(true);
      setOtpError('');
      setOtpInfo('');
      await api.post(`/auth/otp/verify`, { email, otp: otpCode });
      await checkAuth();
      navigate('/');
    } catch (err: any) {
      // On error, do NOT proceed. Show error in the OTP form so the user
      // can retry with a different code or re-request a new one.
      setOtpError(err.response?.data?.message || "Invalid or expired code");
      // Keep otpSent = true so the OTP form stays visible for retry
    } finally {
      setOtpLoading(false);
    }
  };

const handleGoogleClick = () => {
    const redirectUri = `${window.location.origin}/signup`;
    initiateGoogleOAuthPKCE(GOOGLE_CLIENT_ID, redirectUri);
  };

  const formContent = otpSent ? (
    <form onSubmit={handleOtpVerify} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-subtle mb-2">Verification Code</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-faint">
            <Lock size={18} />
          </div>
          <input
            type="text"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
            maxLength={6}
            inputMode="numeric"
            className="w-full pl-10 pr-4 py-3 border-2 border-subtle-line/50 bg-raised/50 rounded font-mono tracking-[0.4em] text-fg transition-all placeholder:text-muted focus:outline-none focus:border-accent focus:bg-raised focus:shadow-[0_0_0_2px_rgba(0,212,255,0.2)]"
            placeholder="123456"
            required
            autoComplete="one-time-code"
          />
        </div>
      </div>
      {otpError && (
        <div className="mb-4 p-3 bg-accent-danger/10 border border-accent-danger/50 rounded-none flex items-center gap-2 text-accent-danger text-sm">
          <AlertCircle size={18} />
          <span>{otpError}</span>
        </div>
      )}
      {otpInfo && (
        <div className="mb-4 p-3 bg-accent/10 border border-accent/30 rounded-none flex items-center gap-2 text-accent text-sm">
          <Mail size={18} />
          <span>{otpInfo}</span>
        </div>
      )}
      <button
        type="submit"
        disabled={otpLoading || otpCode.length !== 6}
        className="w-full flex items-center justify-center gap-2 bg-accent shadow-[0_0_16px_rgba(0,212,255,0.25)] hover:bg-accent-primary hover:shadow-[0_0_24px_rgba(0,212,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed text-ink py-3 px-4 rounded-none font-bold transition-all duration-200"
      >
        {otpLoading ? "Verifying..." : "Verify"} {!otpLoading && <ArrowRight size={18} />}
      </button>
          <div className="mt-4 text-center text-sm text-subtle">
            <button
              type="button"
              onClick={async () => {
                const trimmedEmailVal = email.trim();
                if (!trimmedEmailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmailVal)) {
                  setOtpError("Please enter a valid email address.");
                  return;
                }
                try {
                  await api.post(`/auth/otp/send`, { email: trimmedEmailVal });
                  setOtpError("");
                  setOtpInfo("Code resent — check your inbox.");
                } catch (err: any) {
                  // otp/send returns 404 for non-existent users during signup;
                  // in that case, trigger a fresh signup attempt via the signup
                  // endpoint which will generate a new OTP.
                  const msg = err.response?.data?.message;
                  if (err.response?.status === 404 || msg?.includes('No account')) {
                    try {
                      await api.post(`/auth/signup`, {
                        username: username.trim(),
                        email: trimmedEmailVal,
                        password,
                        avatarUrl: getInitialsAvatar(username.trim())
                      });
                      setOtpError("");
                      setOtpInfo("Code resent — check your inbox.");
                    } catch (resendErr: any) {
                      setOtpError(resendErr.response?.data?.message || "Could not resend the code. Try again.");
                    }
                  } else {
                    setOtpError(msg || "Could not resend the code. Try again.");
                  }
                }
              }}
              disabled={otpLoading}
              className="text-accent hover:underline"
            >
              Resend code
            </button>
          </div>
    </form>
  ) : (
    <form onSubmit={handleSignup} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-subtle mb-2">Username</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-faint"><User size={18} /></div>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-10 pr-4 py-3 border-2 border-subtle-line/50 bg-raised/50 rounded transition-all text-fg placeholder:text-muted focus:outline-none focus:border-accent focus:bg-raised focus:shadow-[0_0_0_2px_rgba(0,212,255,0.2)]"
          placeholder="CyberCoder" required />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-subtle mb-2">Email Address</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-faint"><Mail size={18} /></div>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 border-2 border-subtle-line/50 bg-raised/50 rounded transition-all text-fg placeholder:text-muted focus:outline-none focus:border-accent focus:bg-raised focus:shadow-[0_0_0_2px_rgba(0,212,255,0.2)]"
          placeholder="you@example.com" required />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-subtle mb-2">Password</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-faint"><Lock size={18} /></div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 border-2 border-subtle-line/50 bg-raised/50 rounded transition-all text-fg placeholder:text-muted focus:outline-none focus:border-accent focus:bg-raised focus:shadow-[0_0_0_2px_rgba(0,212,255,0.2)]"
          placeholder="........" required />
        </div>
      </div>

      <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-accent shadow-[0_0_16px_rgba(0,212,255,0.25)] hover:bg-accent-primary hover:shadow-[0_0_24px_rgba(0,212,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed text-ink py-3 px-4 rounded-none font-bold transition-all duration-200">
        {loading ? "Creating account..." : "Sign Up"} {!loading && <ArrowRight size={18} />}
      </button>
    </form>
  );

  if (authLoading) return <PageSkeleton />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-void">
      {/* Left Side: Onboarding Steps */}
      <div className="hidden md:flex flex-col justify-center items-center relative overflow-hidden bg-panel p-12"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      >
        <img src="/brace-icon-v6.svg" alt="BRACE RCE Logo" className="w-10 h-10 mb-8" />
        <div className="w-full border-t border-subtle-line mb-8"></div>
        <div className="flex flex-col gap-8 w-full">
          {/* Current feature set — keep in sync with the home bento
              (WorkspaceDirectory) and the About telemetry. Honest claims only:
              five runtimes, not an inflated count. */}
          <div className="flex gap-4">
            <span className="text-xs font-mono text-accent font-bold">01</span>
            <div>
              <p className="text-sm text-fg font-medium mb-1">Practice in the workspace</p>
              <p className="text-xs text-subtle">Side-by-side editor with hints, examples, and test cases across five runtimes — JS, Python, Java, C, C++.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="text-xs font-mono text-accent font-bold">02</span>
            <div>
              <p className="text-sm text-fg font-medium mb-1">Compete in live rooms</p>
              <p className="text-xs text-subtle">1v1 duels on one problem with a shared clock; your rating updates after each match.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="text-xs font-mono text-accent font-bold">03</span>
            <div>
              <p className="text-sm text-fg font-medium mb-1">Verify every run</p>
              <p className="text-xs text-subtle">Visible, hidden, and edge tests with verdicts, runtimes, and output diffs — then replay decisive matches.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="flex items-center justify-center px-4 py-12 relative">
        <div className="max-w-md w-full bg-surface bg-opacity-90 border border-accent/20 rounded-lg shadow-card p-8 relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-fg mb-2">Create account</h1>
            <p className="text-subtle">Create a handle and start solving in the sandbox</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-accent-danger/10 border border-accent-danger/50 rounded-none flex items-center gap-3 text-accent-danger">
              <AlertCircle size={20} />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {formContent}

          {GOOGLE_AUTH_ENABLED ? (
            <>
              <div className="mt-8 flex items-center gap-4 before:h-px before:flex-1 before:bg-surface-hover after:h-px after:flex-1 after:bg-surface-hover"><span className="text-xs font-medium text-subtle uppercase">Or continue with</span></div>
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3 px-4 rounded-none font-bold transition-all duration-200"
                  disabled={loading}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>
            </>
          ) : (
            <p className="rounded-none border border-accent-warning/40 bg-accent-warning/5 px-3 py-2 text-center text-[11px] uppercase tracking-widest text-accent-warning">
              Google sign-in not configured
            </p>
          )}

          <p className="mt-8 text-center text-sm text-subtle">Already have an account?{' '}<Link to="/signin" className="text-accent hover:underline font-medium transition-colors">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
};
