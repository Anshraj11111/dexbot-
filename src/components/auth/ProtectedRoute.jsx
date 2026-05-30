/**
 * ProtectedRoute — redirects unauthenticated users to /login.
 * Requirements: 1.6, 14.10
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute() {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // Still resolving auth state — show nothing (avoids flash)
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-purple/40 border-t-accent-purple rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  return <Outlet />;
}
