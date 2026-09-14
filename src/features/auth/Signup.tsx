import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, Eye, EyeOff } from 'lucide-react';

const Signup = () => {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(username, email, password);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#050811] text-slate-100 font-mono">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#080a10] border-r border-white/8 flex-col justify-center px-16 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(0,243,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,243,255,0.04) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        
        <div className="relative z-10">
          <img src="/favicon.svg" alt="BRACE RCE" className="w-10 h-10 mb-12" />
          
          <div className="border-t border-white/6 pt-6 mb-8">
            <div className="space-y-4">
              <div className="flex gap-4">
                <span className="text-cyan-400 font-mono text-xs font-bold">01</span>
                <div>
                  <p className="text-sm text-white font-bold">Create your profile.</p>
                  <p className="text-xs text-[#8892A4] mt-0.5">Choose a handle — it's your callsign in every match.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-cyan-400 font-mono text-xs font-bold">02</span>
                <div>
                  <p className="text-sm text-white font-bold">Enter the lobby.</p>
                  <p className="text-xs text-[#8892A4] mt-0.5">Join or host rooms. Challenge others directly.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-cyan-400 font-mono text-xs font-bold">03</span>
                <div>
                  <p className="text-sm text-white font-bold">Build your record.</p>
                  <p className="text-xs text-[#8892A4] mt-0.5">Every solve tracked. Rating adjusts after each match.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/6 pt-6">
            <div className="flex items-center gap-8">
              <div>
                <div className="text-base font-black text-cyan-400 font-mono">1v1</div>
                <div className="text-[9px] text-[#3D4657] uppercase tracking-widest">Live battles</div>
              </div>
              <div>
                <div className="text-base font-black text-cyan-400 font-mono">12+</div>
                <div className="text-[9px] text-[#3D4657] uppercase tracking-widest">Languages</div>
              </div>
              <div>
                <div className="text-base font-black text-cyan-400 font-mono">Real</div>
                <div className="text-[9px] text-[#3D4657] uppercase tracking-widest">Execution</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - FORM */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-sm bg-[#080a10] border border-white/8 p-8">
          <h2 className="text-xl font-bold text-white mb-6">Create account</h2>
          
          {error && (
            <div className="mb-4 p-3 border border-[#FF3B5C]/30 bg-[#FF3B5C]/5 text-[#FF3B5C] text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] text-[#8892A4] uppercase tracking-widest mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-cyan-500/15 bg-[#050811] text-white text-sm focus:border-cyan-400 focus:outline-none focus:shadow-[0_0_0_1px_rgba(0,243,255,0.2)] transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#8892A4] uppercase tracking-widest mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-cyan-500/15 bg-[#050811] text-white text-sm focus:border-cyan-400 focus:outline-none focus:shadow-[0_0_0_1px_rgba(0,243,255,0.2)] transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#8892A4] uppercase tracking-widest mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-cyan-500/15 bg-[#050811] text-white text-sm focus:border-cyan-400 focus:outline-none focus:shadow-[0_0_0_1px_rgba(0,243,255,0.2)] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8892A4] hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#00D4FF] text-[#050608] font-bold text-sm hover:bg-cyan-300 hover:shadow-[0_0_16px_rgba(0,243,255,0.3)] transition-all disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-xs text-[#8892A4] text-center">
            Already have an account?{' '}
            <Link to="/signin" className="text-[#00D4FF] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
