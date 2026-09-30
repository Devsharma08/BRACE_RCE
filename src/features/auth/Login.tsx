import { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageSkeleton } from '../../components/ui/Skeleton';
import {api} from "../../config/api";
import { initiateGoogleOAuthPKCE, handleGoogleCallbackPKCE } from '../../utils/oauth';
import { isFeatureEnabled } from '../../config/features';

/**
 * Cloudflare Turnstile site key.
 *
 * No fallback to Cloudflare's always-pass test key ('1x00000000000000000000AA'):
 * that key renders a real-looking widget which never actually blocks anything,
 * which is a false promise of security. When no key is configured the widget is
 * not rendered and an honest notice is shown instead.
 */
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
const TURNSTILE_ENABLED = isFeatureEnabled('turnstile') && TURNSTILE_SITE_KEY.trim().length > 0;

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
          <span className="text-3xl font-bold text-fg" style={{ fontFamily: "'Orbitron', sans-serif" }}>Battle.</span>
          <span className="text-3xl font-bold text-fg" style={{ fontFamily: "'Orbitron', sans-serif" }}>Ranked.</span>
          <span className="text-3xl font-bold text-accent" style={{ fontFamily: "'Orbitron', sans-serif" }}>Code.</span>
        </div>
        <span className="text-xs font-mono text-subtle tracking-widest uppercase mb-8">Remote Code Execution Arena</span>
        <div className="w-full border-t border-subtle-line mb-8"></div>
        <div className="flex items-center justify-between w-full">
          <div className="text-center"><div className="text-xl font-black text-accent-primary font-mono">1v1</div><div className="text-[9px] text-faint uppercase tracking-[0.15em]">Live battles</div></div>
          <div className="text-center"><div className="text-xl font-black text-accent-primary font-mono">12+</div><div className="text-[9px] text-faint uppercase tracking-[0.15em]">Languages</div></div>
          <div className="text-center"><div className="text-xl font-black text-accent-primary font-mono">Real</div><div className="text-[9px] text-faint uppercase tracking-[0.15em]">Execution</div></div>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-12 relative">
        <div className="max-w-md w-full bg-raised border border-accent-primary/15 p-8 relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-fg mb-2">Welcome back</h1>
            <p className="text-subtle">Sign in to your account</p>
          </div>
          {error && (
            <div className="mb-6 p-4 bg-accent-danger/10 border border-accent-danger/50 rounded-none flex items-center gap-3 text-accent-danger">
              <AlertCircle size={20} />
              <p className="text-sm">{error}</p>
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-subtle mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-faint"><Mail size={18} /></div>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-raised border border-accent-primary/15 rounded-none text-fg focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_rgba(0,212,255,0.15)] transition-colors" placeholder="you@example.com" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-subtle mb-2">Password</label>
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
            <button type="submit" disabled={loading || (TURNSTILE_ENABLED && !captchaToken)} className="w-full flex items-center justify-center gap-2 bg-accent shadow-[0_0_16px_rgba(0,212,255,0.25)] hover:bg-accent-primary hover:shadow-[0_0_24px_rgba(0,212,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed text-ink py-3 px-4 rounded-none font-bold transition-all duration-200">
              {loading ? "Signing in..." : "Sign In"} {!loading && <ArrowRight size={18} />}
            </button>
          </form>
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
          <p className="mt-8 text-center text-sm text-subtle">Don't have an account?{' '}<Link to="/signup" className="text-accent hover:underline font-medium transition-colors">Create one now</Link></p>
        </div>
      </div>
    </div>
  );
};