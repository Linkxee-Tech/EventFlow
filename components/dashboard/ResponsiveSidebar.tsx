'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard, CalendarDays, PlusCircle,
  ScanLine, Wallet, Settings, LogOut,
  Menu, X, Sun, Moon,
} from 'lucide-react';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { cn } from '@/lib/cn';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/dashboard/events', icon: CalendarDays, label: 'My Events' },
  { href: '/dashboard/events/create', icon: PlusCircle, label: 'Create Event' },
  { href: '/dashboard/scan', icon: ScanLine, label: 'Check-in Scanner' },
  { href: '/dashboard/payouts', icon: Wallet, label: 'Payouts' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  id?: string;
}

interface Props { user: User }

function NavLink({
  href, icon: Icon, label, exact, onClick,
}: {
  href: string; icon: React.ElementType; label: string;
  exact?: boolean; onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all',
        active
          ? 'bg-indigo-500/15 text-indigo-300 font-medium'
          : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

function SidebarContent({ user, onNavClick }: { user: User; onNavClick?: () => void }) {
  const { theme, setTheme } = useTheme();
  const initials = (user.name ?? user.email ?? 'U')
    .split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex flex-col h-full">
      {/* Logo + top bar */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.06]">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-base">🎟</div>
          <span className="font-semibold tracking-tight text-white">EventFlow</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-white"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600 px-3 py-2">
          Organizer
        </p>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} onClick={onNavClick} />
        ))}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer">
          {user.image ? (
            <img src={user.image} alt="" className="w-7 h-7 rounded-full shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user.name ?? 'Organizer'}</p>
            <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ResponsiveSidebar({ user }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      {/* ── Desktop sidebar (≥ lg breakpoint) ─────────────────────────────── */}
      <aside className="hidden lg:flex w-56 flex-col shrink-0 bg-[#1A1A2E] border-r border-white/[0.06]">
        <SidebarContent user={user} />
      </aside>

      {/* ── Mobile / tablet topbar ──────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#1A1A2E]/95 backdrop-blur border-b border-white/[0.06] flex items-center justify-between px-4 h-14">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-sm">🎟</div>
          <span className="font-semibold text-white text-sm">EventFlow</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors text-slate-400"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ── Mobile top padding offset ────────────────────────────────────────── */}
      <div className="lg:hidden h-14 w-full shrink-0 hidden" />

      {/* ── Mobile drawer overlay ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ─────────────────────────────────────────────────── */}
      <aside
        className={cn(
          'lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#1A1A2E] border-r border-white/[0.06] transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setMobileOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <SidebarContent user={user} onNavClick={() => setMobileOpen(false)} />
      </aside>

      {/* ── Mobile content top padding so content isn't under topbar ────── */}
      <style>{`
        @media (max-width: 1023px) {
          main { padding-top: 56px; }
        }
      `}</style>
    </>
  );
}
