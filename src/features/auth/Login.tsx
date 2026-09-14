import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import { GoogleLogin } from '@react-oauth/google';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageSkeleton } from '../../components/ui/Skeleton';
import {api} from "../../config/api";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'; 

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
    if (!captchaToken) {
      setError("Please complete the captcha.");
      return;
    }
    try {
      setLoading(true);
      setError('');
      await api.post(`/auth/signin`, { email, password, captchaToken });
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
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-[#050811]">
      <div className="hidden md:flex flex-col justify-center items-center relative overflow-hidden bg-[#080a10] p-12"
        style={{ backgroundImage: 'linear-gradient(rgba(0,243,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,243,255,0.04) 1px, transparent 1px)', backgroundSize: '48px 48px' }}
      >
        <img src="/favicon.svg" alt="BRACE RCE Logo" className="w-10 h-10 mb-8" style={{ filter: 'drop-shadow(0 0 8px rgba(0,243,255,0.6))' }} />
        <div className="flex flex-col gap-1 mb-6">
          <span className="text-3xl font-bold text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>Battle.</span>
          <span className="text-3xl font-bold text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>Ranked.</span>
          <span className="text-3xl font-bold text-[#00D4FF]" style={{ fontFamily: "'Orbitron', sans-serif" }}>Code.</span>
        </div>
        <span className="text-xs font-mono text-[#8892A4] tracking-widest uppercase mb-8">Remote Code Execution Arena</span>
        <div className="w-full border-t border-white/6 mb-8"></div>
        <div className="flex items-center justify-between w-full">
          <div className="text-center"><div className="text-xs text-[#8892A4] font-mono">1v1</div><div className="text-[10px] text-[#3D4657]">Live battles</div></div>
          <div className="text-center"><div className="text-xs text-[#8892A4] font-mono">12+</div><div className="text-[10px] text-[#3D4657]">Languages</div></div>
          <div className="text-center"><div className="text-xs text-[#8892A4] font-mono">Real</div><div className="text-[10px] text-[#3D4657]">Execution</div></div>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-12 relative">
        <div className="max-w-md w-full bg-[#080a10] border border-white/8 p-8 relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
            <p className="text-[#8892A4]">Sign in to your account</p>
          </div>
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-none flex items-center gap-3 text-red-400">
              <AlertCircle size={20} />
              <p className="text-sm">{error}</p>
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#8892A4] mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#3D4657]"><Mail size={18} /></div>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-[#0c0f18] border border-white/8 rounded-none text-[#F0F4FF] focus:outline-none focus:border-[#00D4FF] transition-colors" placeholder="you@example.com" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8892A4] mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#3D4657]"><Lock size={18} /></div>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-[#0c0f18] border border-cyan-500/15 rounded-none text-[#F0F4FF] focus:outline-none focus:border-[#00D4FF] focus:shadow-[0_0_0_1px_rgba(0,243,255,0.2)] transition-colors" placeholder="........" required />
              </div>
            </div>
            <div className="flex justify-center py-2"><Turnstile siteKey={TURNSTILE_SITE_KEY} onSuccess={(token) => setCaptchaToken(token)} options={{ theme: 'dark' }} /></div>
            <button type="submit" disabled={loading || !captchaToken} className="w-full flex items-center justify-center gap-2 bg-[#00D4FF] hover:bg-cyan-300 hover:shadow-[0_0_16px_rgba(0,243,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed text-[#050608] py-3 px-4 rounded-none font-bold transition-all duration-200">
              {loading ? "Signing in..." : "Sign In"} {!loading && <ArrowRight size={18} />}
            </button>
          </form>
          {Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID) && (
            <>
              <div className="mt-8 flex items-center gap-4 before:h-px before:flex-1 before:bg-white/8 after:h-px after:flex-1 after:bg-white/8"><span className="text-xs font-medium text-[#8892A4] uppercase">Or continue with</span></div>
              <div className="mt-6 flex justify-center"><GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError('Google Login Failed')} theme="filled_black" shape="rectangular" text="signin_with" /></div>
            </>
          )}
          <p className="mt-8 text-center text-sm text-[#8892A4]">Don't have an account?{' '}<Link to="/signup" className="text-[#00D4FF] hover:underline font-medium transition-colors">Create one now</Link></p>
        </div>
      </div>
    </div>
  );
};