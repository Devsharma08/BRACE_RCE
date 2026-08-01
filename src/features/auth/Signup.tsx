import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import { GoogleLogin } from '@react-oauth/google';
import { Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/authContext';
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
  const { checkAuth } = useAuth();

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
      await api.post(`/auth/google`, {
        credential: credentialResponse.credential
      });
      await checkAuth();
      navigate('/');
    } catch (err) {
      setError("Google Signup failed");
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-[#0d1117]">

      {/* Left Side: Generated Cyber Battle Art */}
      <div className="hidden md:flex flex-col justify-center items-center relative overflow-hidden border-r border-white/5 bg-black">
        <img 
          src="/signup-art.png" 
          alt="Cyber Battle Arena" 
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-transparent to-transparent"></div>
        <div className="relative z-10 p-12 text-center backdrop-blur-sm bg-black/40 border border-white/10 rounded-2xl mx-8 shadow-2xl">
          <h2 className="text-3xl font-bold text-white mb-3 tracking-tight uppercase">Join the Battle</h2>
          <p className="text-sm text-cyan-400 font-mono tracking-widest">// PVP_CODING_INITIALIZED</p>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="flex items-center justify-center px-4 py-12 relative pt-16">
        {/* Subtle glowing background effect for the form side */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="max-w-md w-full bg-[#161b22]/80 backdrop-blur-md border border-[#30363d] rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-[#8b949e]">Join BRACE // RCE to start battling</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-400">
            <AlertCircle size={20} />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#c9d1d9] mb-1.5">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8b949e]">
                <User size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-[#c9d1d9] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                placeholder="CyberCoder"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#c9d1d9] mb-1.5">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8b949e]">
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-[#c9d1d9] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#c9d1d9] mb-1.5">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8b949e]">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-[#c9d1d9] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="flex justify-center py-1">
            <Turnstile
              siteKey={TURNSTILE_SITE_KEY}
              onSuccess={(token) => setCaptchaToken(token)}
              options={{ theme: 'dark' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !captchaToken}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 mt-2"
          >
            {loading ? "Creating account..." : "Sign Up"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-4 before:h-px before:flex-1 before:bg-[#30363d] after:h-px after:flex-1 after:bg-[#30363d]">
          <span className="text-xs font-medium text-[#8b949e] uppercase">Or continue with</span>
        </div>

        <div className="mt-5 flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google Signup Failed')}
            theme="filled_black"
            shape="rectangular"
            text="signup_with"
          />
        </div>

        <p className="mt-6 text-center text-sm text-[#8b949e]">
          Already have an account?{' '}
          <Link to="/signin" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
      </div>
      </div>
  )
}
