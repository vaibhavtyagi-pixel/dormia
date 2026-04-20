import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { useAuth } from '../../context/AuthContext.jsx';
import DevBanner from './DevBanner.jsx';
import { auth } from '../../firebase.js';

const links = [
  { to: '/', icon: '📊', label: 'Dashboard' },
  { to: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
  { to: '/lost-streaks', icon: '💤', label: 'Lost Streaks' },
  { to: '/improve', icon: '🌙', label: 'Improve' },
  { to: '/profile', icon: '👤', label: 'Profile' },
];

function SidebarContent({ onNavigate }) {
  const { playerData } = useAuth();
  const navigate = useNavigate();
  const displayName = playerData?.displayName ?? 'Player';

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/signin', { replace: true });
  };

  return (
    <>
      <div>
        <h1 className="font-sora text-[22px] font-extrabold tracking-tight text-indigo">DORMIA</h1>
        <p className="mt-1 text-[11px] font-light lowercase text-indigo-light">sleep is now a sport</p>
      </div>

      <nav className="mt-8 flex flex-col gap-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onNavigate}
            end={link.to === '/'}
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-sm transition ${
                isActive
                  ? 'bg-indigo text-white font-medium'
                  : 'text-text-secondary hover:bg-indigo-pale/70 hover:text-ink'
              }`
            }
          >
            <span className="mr-2 text-lg">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="card mt-auto flex items-center gap-3 px-3 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo font-mono text-lg font-medium text-white">
          {displayName.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-medium text-ink">{displayName}</p>
          <button type="button" onClick={handleSignOut} className="text-xs text-text-secondary">
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}

function AppShell() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-base text-ink md:grid md:grid-cols-[220px_1fr]">
      <button
        type="button"
        onClick={() => setIsMobileOpen((value) => !value)}
        className="fixed left-4 top-4 z-40 rounded-xl border border-border bg-card p-2 text-xl text-ink md:hidden"
      >
        ☰
      </button>

      <aside className="hidden h-screen border-r border-border bg-indigo-cloud p-6 md:sticky md:top-0 md:flex md:flex-col">
        <SidebarContent />
      </aside>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-30 bg-indigo/10 md:hidden" onClick={() => setIsMobileOpen(false)}>
          <aside
            className="h-full w-[220px] border-r border-border bg-indigo-cloud p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-full flex-col">
              <SidebarContent onNavigate={() => setIsMobileOpen(false)} />
            </div>
          </aside>
        </div>
      ) : null}

      <main className="animate-fade-up min-h-screen overflow-y-auto px-4 pb-6 pt-16 md:px-8 md:pt-8">
        <DevBanner />
        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
