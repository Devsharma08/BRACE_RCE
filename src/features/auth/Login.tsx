import { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import { Mail, Lock, AlertCircle, ArrowRight, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageSkeleton } from '../../components/ui/Skeleton';
import {api} from "../../config/api";
import { initiateGoogleOAuthPKCE, handleGoogleCallbackPKCE } from '../../utils/oauth';
import { isFeatureEnabled } from '../../config/features';
import { TURNSTILE_ENABLED, TURNSTILE_SITE_KEY } from '../../config/turnstile';

// Root.tsx falls back to the literal "not-configured" for GoogleOAuthProvider.
// Treat it as unset here too — rendering the button with that placeholder sent
// users to Google's "invalid client" page with no in-app explanation.
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
const GOOGLE_AUTH_ENABLED =
  isFeatureEnabled('googleOAuth') &&
  GOOGLE_CLIENT_ID.length > 0 &&
  GOOGLE_CLIENT_ID !== 'not-configured';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Which panel the auth card shows: password sign-in, one-time email code, or
  // the forgot-password request.
  const [view, setView] = useState<'signin' | 'otp' | 'reset'>('signin');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  // Success/informational message shown above the form (e.g. "code sent").
  const [info, setInfo] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // Remount nonce: bump whenever the widget reports an expired/errored token
  // (e.g. a page kept open across logout) so a fresh challenge renders.
  const [captchaKey, setCaptchaKey] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { checkAuth, isAuthenticated, isLoading: authLoading } = useAuth();

  const resetCaptcha = () => {
    setCaptchaToken(null);
    setCaptchaKey((k) => k + 1);
  };

  // Handle Google OAuth callback on mount
  useEffect(() => {
    const result = handleGoogleCallbackPKCE();
    if (result) {
      (async () => {
        try {
          await api.post("/auth/google/callback", {
            code: result.code,
            code_verifier: result.codeVerifier,
            redirect_uri: `${window.location.origin}/signin`,
          });
          await checkAuth();
          navigate("/");
        } catch (err: any) {
          setError(err.response?.data?.message || "Google Login failed");
        }
      })();
    }
  }, [checkAuth, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Only require the captcha when one is actually configured, otherwise an
    // un-configured widget would make sign-in impossible.
    if (TURNSTILE_ENABLED && !captchaToken) {
      setError("Please complete the captcha.");
      return;
    }
    try {
      setLoading(true);
      setError('');
      await api.post(`/auth/signin`, { email, password, captchaToken: captchaToken ?? undefined });
      await checkAuth();
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Reset the card back to password sign-in, clearing transient state.
  const switchView = (next: 'signin' | 'otp' | 'reset') => {
    setView(next);
    setError('');
    setInfo('');
    setOtpSent(false);
    setOtp('');
  };

  // POST /auth/otp/send — the server emails a single-use 6-digit code.
  const sendOtp = async () => {
    try {
      setLoading(true);
      setError('');
      setInfo('');
      await api.post(`/auth/otp/send`, { email });
      setOtpSent(true);
      setInfo(`A 6-digit code was sent to ${email}. It expires in 10 minutes.`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not send the verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpSent) {
      await sendOtp();
      return;
    }
    try {
      setLoading(true);
      setError('');
      await api.post(`/auth/otp/verify`, { email, otp });
      await checkAuth();
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid or expired verification code");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setInfo('');
      await api.post(`/auth/password-reset/request`, { email });
      setInfo("If an account with that email exists, a password reset link has been sent. Check your inbox.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not send the password reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    const redirectUri = `${window.location.origin}/signin`;
    initiateGoogleOAuthPKCE(GOOGLE_CLIENT_ID, redirectUri);
  };

  if (authLoading) return <PageSkeleton />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-void">
      <div className="hidden md:flex flex-col justify-center items-center relative overflow-hidden bg-panel p-12"
        style={{ backgroundImage: 'linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)', backgroundSize: '48px 48px' }}
      >
        <img src="/favicon.svg" alt="BRACE RCE Logo" className="w-10 h-10 mb-8" style={{ filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.6))' }} />
        <div className="flex flex-col gap-1 mb-6">
          <span className="text-3xl font-bold text-fg" style={{ fontFamily: "'Orbitron', sans-serif" }}>Solve.</span>
          <span className="text-3xl font-bold text-fg" style={{ fontFamily: "'Orbitron', sans-serif" }}>Compete.</span>
          <span className="text-3xl font-bold text-accent" style={{ fontFamily: "'Orbitron', sans-serif" }}>Verify.</span>
        </div>
        {/* Feature strip mirrors what the app actually ships: five runtimes
            (JS/Python/Java/C/C++), 1v1 realtime rooms, and sandbox isolation.
            The old panel claimed "12+ Languages" — the harness has five. */}
        <span className="text-xs font-mono text-subtle tracking-widest uppercase mb-8">Workspace · sandboxed runs · live 1v1 duels</span>
        <div className="w-full border-t border-subtle-line mb-8"></div>
        <div className="flex items-center justify-between w-full">
          <div className="text-center"><div className="text-xl font-black text-accent-primary font-mono">5</div><div className="text-[9px] text-faint uppercase tracking-[0.15em]">Runtimes</div></div>
          <div className="text-center"><div className="text-xl font-black text-accent-primary font-mono">1v1</div><div className="text-[9px] text-faint uppercase tracking-[0.15em]">Live battles</div></div>
          <div className="text-center"><div className="text-xl font-black text-accent-primary font-mono">100%</div><div className="text-[9px] text-faint uppercase tracking-[0.15em]">Sandboxed</div></div>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12 relative">
        <div className="max-w-lg w-full bg-surface bg-opacity-90 border border-accent/20 rounded-lg shadow-card p-8 relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-fg mb-2">
              {view === 'signin' ? 'Welcome back' : view === 'otp' ? 'Email code sign-in' : 'Reset password'}
            </h1>
            <p className="text-subtle">
              {view === 'signin'
                ? 'Sign in to your account'
                : view === 'otp'
                  ? otpSent
                    ? `We sent a 6-digit code to ${email}`
                    : 'Sign in with a one-time code sent to your email'
                  : "Enter your email and we'll send you a reset link"}
            </p>
          </div>
          {error && (
            <div className="mb-6 p-4 bg-accent-danger/10 border border-accent-danger/30 rounded-lg flex items-center gap-3 text-accent-danger">
              <AlertCircle size={20} />
              <p className="text-sm">{error}</p>
            </div>
          )}
          {info && (
            <div className="mb-6 p-4 bg-accent/10 border border-accent/30 rounded-lg flex items-center gap-3 text-accent">
              <Mail size={20} />
              <p className="text-sm">{info}</p>
            </div>
          )}
          {view === 'signin' && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-subtle mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-faint"><Mail size={18} /></div>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-raised border border-accent-primary/15 rounded-none text-fg focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_rgba(0,212,255,0.15)] transition-colors" placeholder="you@example.com" required />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-subtle">Password</label>
                <button type="button" onClick={() => switchView('reset')} className="text-xs text-accent hover:underline transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-faint"><Lock size={18} /></div>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-raised border border-accent-primary/15 rounded-none text-fg focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_rgba(0,212,255,0.15)] transition-colors" placeholder="........" required />
              </div>
            </div>
            {TURNSTILE_ENABLED ? (
              <div className="flex justify-center py-2">
                <Turnstile
                  key={captchaKey}
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onExpire={resetCaptcha}
                  onError={resetCaptcha}
                  options={{ theme: 'dark' }}
                />
              </div>
            ) : (
              <p className="rounded-none border border-accent-warning/40 bg-accent-warning/5 px-3 py-2 text-center text-[11px] uppercase tracking-widest text-accent-warning">
                Bot protection not configured
              </p>
            )}
            <button type="submit" disabled={loading || (TURNSTILE_ENABLED && !captchaToken)} className="w-full flex items-center justify-center gap-2 bg-accent shadow-accent hover:bg-accent-primary hover:shadow-accent-lg disabled:opacity-50 disabled:cursor-not-allowed text-ink py-3 px-4 rounded-none font-bold transition-all duration-200">
              {loading ? "Signing in..." : "Sign In"} {!loading && <ArrowRight size={18} />}
            </button>
            <button type="button" onClick={() => switchView('otp')} disabled={loading} className="w-full text-sm text-subtle hover:text-accent transition-colors py-1">
              Sign in with a one-time email code instead
            </button>
          </form>
          )}

          {view === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-subtle mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-faint"><Mail size={18} /></div>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={otpSent} className="w-full pl-10 pr-4 py-3 bg-raised border border-accent-primary/15 rounded-none text-fg focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_rgba(0,212,255,0.15)] transition-colors disabled:opacity-60" placeholder="you@example.com" required />
                </div>
              </div>
              {otpSent && (
                <div>
                  <label className="block text-sm font-medium text-subtle mb-2">Verification Code</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-faint"><KeyRound size={18} /></div>
                    <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} className="w-full pl-10 pr-4 py-3 bg-raised border border-accent-primary/15 rounded-none font-mono tracking-[0.4em] text-fg focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_rgba(0,212,255,0.15)] transition-colors" placeholder="000000" required />
                  </div>
                </div>
              )}
              <button type="submit" disabled={loading || (otpSent && otp.length !== 6)} className="w-full flex items-center justify-center gap-2 bg-accent shadow-accent hover:bg-accent-primary hover:shadow-accent-lg disabled:opacity-50 disabled:cursor-not-allowed text-ink py-3 px-4 rounded-none font-bold transition-all duration-200">
                {loading ? (otpSent ? "Verifying..." : "Sending...") : otpSent ? "Verify & Sign In" : "Send Code"} {!loading && <ArrowRight size={18} />}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => switchView('signin')} disabled={loading} className="text-subtle hover:text-accent transition-colors inline-flex items-center gap-1">
                  <ArrowLeft size={14} /> Password sign in
                </button>
                {otpSent && (
                  <button type="button" onClick={sendOtp} disabled={loading} className="text-accent hover:underline disabled:opacity-50">
                    Resend code
                  </button>
                )}
              </div>
            </form>
          )}

          {view === 'reset' && (
            <form onSubmit={handlePasswordResetRequest} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-subtle mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-faint"><Mail size={18} /></div>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-raised border border-accent-primary/15 rounded-none text-fg focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_rgba(0,212,255,0.15)] transition-colors" placeholder="you@example.com" required />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-accent shadow-accent hover:bg-accent-primary hover:shadow-accent-lg disabled:opacity-50 disabled:cursor-not-allowed text-ink py-3 px-4 rounded-none font-bold transition-all duration-200">
                {loading ? "Sending..." : "Send Reset Link"} {!loading && <ArrowRight size={18} />}
              </button>
              <button type="button" onClick={() => switchView('signin')} disabled={loading} className="w-full text-sm text-subtle hover:text-accent transition-colors inline-flex items-center justify-center gap-1">
                <ArrowLeft size={14} /> Back to sign in
              </button>
            </form>
          )}
{view === 'signin' && (GOOGLE_AUTH_ENABLED ? (
            <>
              <div className="mt-8 flex items-center gap-4 before:h-px before:flex-1 before:bg-surface-hover after:h-px after:flex-1 after:bg-surface-hover"><span className="text-xs font-medium text-subtle uppercase">Or continue with</span></div>
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  className="w-full flex items-center justify-center gap-2 bg-surface/10 hover:bg-surface/20 border border-accent/30 py-3 px-4 rounded-none font-bold transition-all duration-200"
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
          ))}
          <p className="mt-8 text-center text-sm text-subtle">Don't have an account?{' '}<Link to="/signup" className="text-accent hover:underline font-medium transition-colors">Create one now</Link></p>
        </div>
      </div>
    </div>
  );
};