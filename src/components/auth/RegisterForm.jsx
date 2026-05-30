/**
 * RegisterForm — Firebase email/password registration.
 * Requirements: 1.2, 1.9
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { validateRegisterForm } from '@/utils/formValidators';
import { NeonButton } from '@/components/ui/NeonButton';

export function RegisterForm() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fields, setFields] = useState({ email: '', password: '', displayName: '' });
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
    const errs = validateRegisterForm(fields);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      await register(fields.email, fields.password, fields.displayName);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err?.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists'
        : err?.message ?? 'Registration failed';
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
      {[
        { name: 'displayName', label: 'Display Name', type: 'text', icon: User, placeholder: 'Operator One' },
        { name: 'email', label: 'Email', type: 'email', icon: Mail, placeholder: 'operator@dexbot.io' },
        { name: 'password', label: 'Password', type: 'password', icon: Lock, placeholder: '••••••••' },
      ].map(({ name, label, type, icon: Icon, placeholder }) => (
        <div key={name}>
          <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">{label}</label>
          <div className="relative">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type={type}
              name={name}
              value={fields[name]}
              onChange={handleChange}
              placeholder={placeholder}
              className={`w-full bg-white/[0.05] border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white
                placeholder-white/20 outline-none transition-colors
                ${errors[name] ? 'border-status-offline/60' : 'border-white/20 focus:border-accent-cyan/60'}`}
            />
          </div>
          {errors[name] && <p className="text-xs text-status-offline mt-1">{errors[name]}</p>}
        </div>
      ))}

      {apiError && (
        <p className="text-sm text-status-offline bg-status-offline/10 border border-status-offline/20 rounded-lg px-3 py-2">
          {apiError}
        </p>
      )}

      <NeonButton type="submit" disabled={loading} className="w-full" size="lg">
        <UserPlus className="w-4 h-4" />
        {loading ? 'Creating account…' : 'Register'}
      </NeonButton>

      <p className="text-center text-sm text-white/40">
        Already have an account?{' '}
        <Link to="/login" className="text-accent-cyan hover:text-accent-cyan/80 transition-colors">
          Login
        </Link>
      </p>
    </motion.form>
  );
}
