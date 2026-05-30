/**
 * Toast notification system.
 * Requirements: 3.5, 5.7, 6.9, 7.2, 8.4, 10.7, 12.3
 */
import { createContext, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle className="w-5 h-5 text-status-online" />,
  error: <XCircle className="w-5 h-5 text-status-offline" />,
  warning: <AlertCircle className="w-5 h-5 text-yellow-400" />,
  info: <Info className="w-5 h-5 text-accent-cyan" />,
};

const BORDER_COLORS = {
  success: 'border-status-online/40',
  error: 'border-status-offline/40',
  warning: 'border-yellow-400/40',
  info: 'border-accent-cyan/40',
};

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl
                bg-white/[0.08] backdrop-blur-xl border ${BORDER_COLORS[toast.type] ?? 'border-white/20'}
                shadow-[0_0_20px_rgba(168,85,247,0.15)] min-w-[280px] max-w-[380px]`}
            >
              <span className="mt-0.5 shrink-0">{ICONS[toast.type]}</span>
              <p className="text-sm text-white/90 flex-1">{toast.message}</p>
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 text-white/40 hover:text-white/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
