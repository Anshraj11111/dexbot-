/**
 * Hook to access the toast notification system.
 * Requirements: 3.5, 5.7, 6.9, 7.2, 8.4, 10.7, 12.3
 */
import { useContext } from 'react';
import { ToastContext } from '@/components/ui/ToastProvider';

export function useToast() {
  return useContext(ToastContext);
}
