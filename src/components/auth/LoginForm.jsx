/**
 * LoginForm — Firebase email/password login.
 * Requirements: 1.1, 1.3, 1.4
 */
import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { validateLoginForm } from '@/utils/formValidators';
import { NeonButton } from '@/components/ui/NeonButton';

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [fields, setFields] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFields((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: '' }));
    setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateLoginForm(fields);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      await login(fields.email, fields.password);
      navigate(redirect, { replace: true });
    } catch (err) {
      const msg = err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password'
        ? 'Invalid email or password'
        : err?.message ?? 'Login failed';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
      noValidate
    >
      {/* Email */}
      <div>
        <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="email"
            name="email"
            value={fields.email}
            onChange={handleChange}
            placeholder="operator@dexbot.io"
            className={`w-full bg-white/[0.05] border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white
              placeholder-white/20 outline-none transition-colors
              ${errors.email ? 'border-status-offline/60' : 'border-white/20 focus:border-accent-cyan/60'}`}
          />
        </div>
        {errors.email && <p className="text-xs text-status-offline mt-1">{errors.email}</p>}
      </div>

      {/* Password */}
      <div>
        <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="password"
            name="password"
            value={fields.password}
            onChange={handleChange}
            placeholder="••••••••"
            className={`w-full bg-white/[0.05] border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white
              placeholder-white/20 outline-none transition-colors
              ${errors.password ? 'border-status-offline/60' : 'border-white/20 focus:border-accent-cyan/60'}`}
          />
        </div>
        {errors.password && <p className="text-xs text-status-offline mt-1">{errors.password}</p>}
      </div>

      {/* API error */}
      {apiError && (
        <p className="text-sm text-status-offline bg-status-offline/10 border border-status-offline/20 rounded-lg px-3 py-2">
          {apiError}
        </p>
      )}

      <NeonButton type="submit" disabled={loading} className="w-full" size="lg">
        <LogIn className="w-4 h-4" />
        {loading ? 'Authenticating…' : 'Login'}
      </NeonButton>

      <p className="text-center text-sm text-white/40">
        No account?{' '}
        <Link to="/register" className="text-accent-cyan hover:text-accent-cyan/80 transition-colors">
          Register
        </Link>
      </p>
    </motion.form>
  );
}
