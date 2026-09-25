import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import { GoogleLogin } from '@react-oauth/google';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageSkeleton } from '../../components/ui/Skeleton';
import {api} from "../../config/api";

/**
 * Cloudflare Turnstile site key.
 *
 * No fallback to Cloudflare's always-pass test key ('1x00000000000000000000AA'):
 * that key renders a real-looking widget which never actually blocks anything,
 * which is a false promise of security. When no key is configured the widget is
 * not rendered and an honest notice is shown instead.
 */
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
const TURNSTILE_ENABLED = TURNSTILE_SITE_KEY.trim().length > 0;

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { checkAuth, isAuthenticated, isLoading: authLoading } = useAuth();

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

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      await api.post(`/auth/google`, { credential: credentialResponse.credential });
      await checkAuth();
      navigate('/');
    } catch (err:any) {
      setError(err.response?.data?.message || "Google Login failed");
    }
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
                <Turnstile siteKey={TURNSTILE_SITE_KEY} onSuccess={(token) => setCaptchaToken(token)} options={{ theme: 'dark' }} />
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
          {Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID) && (
            <>
              <div className="mt-8 flex items-center gap-4 before:h-px before:flex-1 before:bg-surface-hover after:h-px after:flex-1 after:bg-surface-hover"><span className="text-xs font-medium text-subtle uppercase">Or continue with</span></div>
              <div className="mt-6 flex justify-center"><GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError('Google Login Failed')} theme="filled_black" shape="rectangular" text="signin_with" /></div>
            </>
          )}
          <p className="mt-8 text-center text-sm text-subtle">Don't have an account?{' '}<Link to="/signup" className="text-accent hover:underline font-medium transition-colors">Create one now</Link></p>
        </div>
      </div>
    </div>
  );
};