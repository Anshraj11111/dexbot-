/**
 * App — React Router v6 route tree with protected routes.
 * Requirements: 14.10
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { NavBar } from '@/components/ui/NavBar';

// Pages — lazy-loaded for performance
import { lazy, Suspense } from 'react';

const ConnectPage = lazy(() => import('@/pages/ConnectPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const RobotsPage = lazy(() => import('@/pages/RobotsPage'));
const RobotControlPage = lazy(() => import('@/pages/RobotControlPage'));
const MessagingPage = lazy(() => import('@/pages/MessagingPage'));
const RoomsPage = lazy(() => import('@/pages/RoomsPage'));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const LiveWebSocketPage = lazy(() => import('@/pages/LiveWebSocketPage'));
const OtaPage = lazy(() => import('@/pages/OtaPage'));
const WifiConfigPage = lazy(() => import('@/pages/WifiConfigPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-base">
      <div className="w-8 h-8 border-2 border-accent-purple/40 border-t-accent-purple rounded-full animate-spin" />
    </div>
  );
}

function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-bg-base">
      <NavBar />
      <main className="flex-1 md:ml-16 xl:ml-56 pt-14 md:pt-0 min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<PageLoader />}>
            <AnimatePresence mode="wait">
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Protected routes */}
                <Route element={<ProtectedRoute />}>
                  <Route
                    path="/"
                    element={<AppLayout><DashboardPage /></AppLayout>}
                  />
                  <Route
                    path="/robots"
                    element={<AppLayout><RobotsPage /></AppLayout>}
                  />
                  <Route
                    path="/robots/:botId/control"
                    element={<AppLayout><RobotControlPage /></AppLayout>}
                  />
                  <Route
                    path="/messaging"
                    element={<AppLayout><MessagingPage /></AppLayout>}
                  />
                  <Route
                    path="/rooms"
                    element={<AppLayout><RoomsPage /></AppLayout>}
                  />
                  <Route
                    path="/analytics"
                    element={<AppLayout><AnalyticsPage /></AppLayout>}
                  />
                  <Route
                    path="/settings"
                    element={<AppLayout><SettingsPage /></AppLayout>}
                  />
                  <Route
                    path="/live"
                    element={<AppLayout><LiveWebSocketPage /></AppLayout>}
                  />
                  <Route
                    path="/ota"
                    element={<AppLayout><OtaPage /></AppLayout>}
                  />
                  <Route
                    path="/wifi"
                    element={<AppLayout><WifiConfigPage /></AppLayout>}
                  />
                  <Route
                    path="/connect"
                    element={<AppLayout><ConnectPage /></AppLayout>}
                  />
                  <Route
                    path="/notifications"
                    element={<AppLayout><NotificationsPage /></AppLayout>}
                  />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AnimatePresence>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
