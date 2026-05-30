/**
 * RegisterPage — new operator registration.
 * Requirements: 1.2, 1.9
 */
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { RegisterForm } from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-accent-blue/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="bg-white/[0.08] backdrop-blur-xl border border-purple-500/40 rounded-2xl
          shadow-[0_0_40px_rgba(168,85,247,0.15)] p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-accent-purple/20 border border-accent-purple/40
              flex items-center justify-center">
              <Zap className="w-5 h-5 text-accent-purple" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wider">DEXBOT OS</h1>
              <p className="text-xs text-white/40">Robot Control System</p>
            </div>
          </div>
          <h2 className="text-lg font-semibold text-white mb-6">Create Account</h2>
          <RegisterForm />
        </div>
      </motion.div>
    </div>
  );
}
