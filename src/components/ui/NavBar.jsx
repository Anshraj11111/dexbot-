/**
 * NavBar — main navigation with user avatar and active route highlighting.
 * Requirements: 1.7, 1.8
 */
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Bot, MessageSquare, Home, BarChart2,
  Settings, Wifi, Upload, LogOut, Menu, X, Zap, UserPlus, Bell,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationBadge } from '@/components/ui/NotificationBadge';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/robots', icon: Bot, label: 'Robots' },
  { to: '/messaging', icon: MessageSquare, label: 'Messages' },
  { to: '/rooms', icon: Home, label: 'Rooms' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/live', icon: Wifi, label: 'Live WS' },
  { to: '/ota', icon: Upload, label: 'OTA' },
  { to: '/connect', icon: UserPlus, label: 'Connect' },
  { to: '/wifi', icon: Wifi, label: 'WiFi' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function NavBar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { unreadCount } = useNotifications();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = getInitials(currentUser?.displayName);

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-16 xl:w-56 h-screen fixed left-0 top-0 z-40
        bg-black/60 backdrop-blur-xl border-r border-purple-500/20">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-accent-purple/20 border border-accent-purple/40
            flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-accent-purple" />
          </div>
          <span className="hidden xl:block text-sm font-bold text-white tracking-wider">DEXBOT</span>
        </div>

        {/* Nav links */}
        <div className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group
                ${isActive
                  ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/30'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.05]'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="hidden xl:block text-sm font-medium">{label}</span>
            </NavLink>
          ))}
          {/* Notifications — separate to support badge */}
          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group
              ${isActive
                ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/30'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.05]'
              }`
            }
          >
            <div className="relative shrink-0">
              <Bell className="w-5 h-5" />
              <NotificationBadge count={unreadCount} />
            </div>
            <span className="hidden xl:block text-sm font-medium">Notifications</span>
          </NavLink>
        </div>

        {/* User section */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-accent-purple/30 border border-accent-purple/50
              flex items-center justify-center text-xs font-bold text-accent-purple shrink-0"
              aria-label={`Avatar for ${currentUser?.displayName}`}>
              {initials}
            </div>
            <div className="hidden xl:block flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{currentUser?.displayName}</p>
              <p className="text-xs text-white/40 truncate">{currentUser?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="hidden xl:flex text-white/40 hover:text-status-offline transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between
        px-4 py-3 bg-black/80 backdrop-blur-xl border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-accent-purple" />
          <span className="text-sm font-bold text-white">DEXBOT</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="text-white/70">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="md:hidden fixed left-0 top-0 bottom-0 z-50 w-64
                bg-black/95 backdrop-blur-xl border-r border-purple-500/20 flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
                <span className="font-bold text-white">DEXBOT OS</span>
                <button onClick={() => setMobileOpen(false)} className="text-white/60">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 py-4 space-y-1 px-3">
                {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                      ${isActive ? 'bg-accent-purple/20 text-accent-purple' : 'text-white/60 hover:text-white'}`
                    }
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{label}</span>
                  </NavLink>
                ))}
                {/* Notifications with badge */}
                <NavLink
                  to="/notifications"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                    ${isActive ? 'bg-accent-purple/20 text-accent-purple' : 'text-white/60 hover:text-white'}`
                  }
                >
                  <div className="relative">
                    <Bell className="w-5 h-5" />
                    <NotificationBadge count={unreadCount} />
                  </div>
                  <span className="text-sm font-medium">Notifications</span>
                </NavLink>
              </div>
              <div className="border-t border-white/10 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-accent-purple/30 border border-accent-purple/50
                    flex items-center justify-center text-xs font-bold text-accent-purple">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{currentUser?.displayName}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm text-status-offline/80 hover:text-status-offline"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
