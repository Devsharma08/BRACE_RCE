import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import { GoogleLogin } from '@react-oauth/google';
import { Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageSkeleton } from '../../components/ui/Skeleton';
import { api } from '../../config/api';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'; 

export const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { checkAuth, isAuthenticated, isLoading: authLoading } = useAuth();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      setError("Please complete the captcha.");
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.post(`/auth/signup`, {
        username,
        email,
        password,
        captchaToken,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
      });
      await checkAuth(); 
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setLoading(true);
      setError('');
      await api.post(`/auth/google`, {
        credential: credentialResponse.credential
      });
      await checkAuth();
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || "Google Signup failed");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <PageSkeleton />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-[#080a10]">
      {/* Left Side: Onboarding Steps */}
      <div className="hidden md:flex flex-col justify-center items-center relative overflow-hidden bg-[#080a10] p-12"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      >
        <img src="/favicon.svg" alt="BRACE RCE Logo" className="w-10 h-10 mb-8" />
        <div className="w-full border-t border-white/6 mb-8"></div>
        <div className="flex flex-col gap-8 w-full">
          <div className="flex gap-4">
            <span className="text-xs font-mono text-[#00D4FF] font-bold">01</span>
            <div>
              <p className="text-sm text-white font-medium mb-1">Create your profile</p>
              <p className="text-xs text-[#8892A4]">Choose a handle — it's your callsign in every match.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="text-xs font-mono text-[#00D4FF] font-bold">02</span>
            <div>
              <p className="text-sm text-white font-medium mb-1">Enter the lobby</p>
              <p className="text-xs text-[#8892A4]">Join or host rooms. Challenge others directly.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="text-xs font-mono text-[#00D4FF] font-bold">03</span>
            <div>
              <p className="text-sm text-white font-medium mb-1">Build your record</p>
              <p className="text-xs text-[#8892A4]">Every solve tracked. Rating adjusts after each match.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="flex items-center justify-center px-4 py-12 relative">
        <div className="max-w-md w-full bg-[#080a10] border border-white/8 p-8 relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Create account</h1>
            <p className="text-[#8892A4]">Join the battle arena</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-none flex items-center gap-3 text-red-400">
              <AlertCircle size={20} />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#8892A4] mb-2">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#3D4657]"><User size={18} /></div>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-[#0c0f18] border border-white/8 rounded-none text-[#F0F4FF] focus:outline-none focus:border-[#00D4FF] transition-colors" placeholder="CyberCoder" required />
              </div>
            </div>

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
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-[#0c0f18] border border-white/8 rounded-none text-[#F0F4FF] focus:outline-none focus:border-[#00D4FF] transition-colors" placeholder="........" required />
              </div>
            </div>

            <div className="flex justify-center py-2"><Turnstile siteKey={TURNSTILE_SITE_KEY} onSuccess={(token) => setCaptchaToken(token)} options={{ theme: 'dark' }} /></div>

            <button type="submit" disabled={loading || !captchaToken} className="w-full flex items-center justify-center gap-2 bg-[#00D4FF] hover:opacity-85 disabled:opacity-50 disabled:cursor-not-allowed text-[#050608] py-3 px-4 rounded-none font-bold transition-all duration-200">
              {loading ? "Creating account..." : "Sign Up"} {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          {Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID) && (
            <>
              <div className="mt-8 flex items-center gap-4 before:h-px before:flex-1 before:bg-white/8 after:h-px after:flex-1 after:bg-white/8"><span className="text-xs font-medium text-[#8892A4] uppercase">Or continue with</span></div>
              <div className="mt-6 flex justify-center"><GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError('Google Signup Failed')} theme="filled_black" shape="rectangular" text="signup_with" /></div>
            </>
          )}

          <p className="mt-8 text-center text-sm text-[#8892A4]">Already have an account?{' '}<Link to="/signin" className="text-[#00D4FF] hover:underline font-medium transition-colors">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
};
