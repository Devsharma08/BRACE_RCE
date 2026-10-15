import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../../config/api';

/**
 * Landing page for password-reset emails. The Firebase action link carries an
 * `oobCode` (+ mode=resetPassword); exchanging it here calls
 * POST /api/v1/auth/password-reset/confirm so the reset happens inside the app.
 *
 * NOTE: Firebase's default email template renders Firebase's own hosted reset
 * page. To use this in-app flow, set the template's Action URL to
 * `${origin}/reset-password` in Firebase Console → Authentication → Templates →
 * Password reset. Without that, the confirm endpoint is still reachable via the
 * API, but the email link completes on Firebase's page.
 */
export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode') ?? '';
  const mode = searchParams.get('mode') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Tolerate a missing mode (custom templates may send only oobCode) but reject
  // links for other actions (e.g. verifyEmail) outright.
  const linkValid = oobCode.length > 0 && (mode === '' || mode === 'resetPassword');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await api.post('/auth/password-reset/confirm', { oobCode, newPassword });
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not reset the password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-void px-4 py-12">
      <div className="max-w-md w-full bg-surface bg-opacity-90 border border-accent/20 rounded-lg shadow-card p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-fg mb-2">Set a new password</h1>
          <p className="text-subtle">
            {done ? 'Your password was updated' : 'Choose a new password for your account'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-accent-danger/10 border border-accent-danger/30 rounded-lg flex items-center gap-3 text-accent-danger">
            <AlertCircle size={20} />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {done ? (
          <div className="space-y-5">
            <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg flex items-center gap-3 text-accent">
              <CheckCircle2 size={20} />
              <p className="text-sm">Password updated. You can now sign in with your new password.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/signin')}
              className="w-full flex items-center justify-center gap-2 bg-accent shadow-accent hover:bg-accent-primary hover:shadow-accent-lg text-ink py-3 px-4 rounded-none font-bold transition-all duration-200"
            >
              Go to sign in <ArrowRight size={18} />
            </button>
          </div>
        ) : linkValid ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-subtle mb-2">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-faint"><Lock size={18} /></div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-raised border border-accent-primary/15 rounded-none text-fg focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_rgba(0,212,255,0.15)] transition-colors"
                  placeholder="........"
                  minLength={8}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-subtle mb-2">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-faint"><Lock size={18} /></div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-raised border border-accent-primary/15 rounded-none text-fg focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_rgba(0,212,255,0.15)] transition-colors"
                  placeholder="........"
                  minLength={8}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-accent shadow-accent hover:bg-accent-primary hover:shadow-accent-lg disabled:opacity-50 disabled:cursor-not-allowed text-ink py-3 px-4 rounded-none font-bold transition-all duration-200"
            >
              {loading ? 'Updating...' : 'Update Password'} {!loading && <ArrowRight size={18} />}
            </button>
            <Link
              to="/signin"
              className="w-full inline-flex items-center justify-center gap-1 text-sm text-subtle hover:text-accent transition-colors"
            >
              Back to sign in
            </Link>
          </form>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-subtle text-center">
              This password reset link is missing or invalid. Request a new one from the sign-in page.
            </p>
            <Link
              to="/signin"
              className="w-full flex items-center justify-center gap-2 bg-accent shadow-accent hover:bg-accent-primary hover:shadow-accent-lg text-ink py-3 px-4 rounded-none font-bold transition-all duration-200"
            >
              Request a new link <ArrowRight size={18} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;