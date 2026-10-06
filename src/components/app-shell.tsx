'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowUpRight, BookOpen, BriefcaseBusiness, ChartNoAxesColumnIncreasing, Check, Command,
  Compass, CreditCard, FileText, FolderKanban, GraduationCap, LayoutDashboard, LogOut, Menu, Search,
  Settings2, Sparkles, X,
} from 'lucide-react';
import { Brand } from './brand';
import { Button } from './ui';

type ShellUser = { id: string; name: string; email: string; branch: string | null; primary_goal: string | null; role: string };

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, section: 'Workspace' },
  { label: 'Learn', href: '/learn', icon: BookOpen, section: 'Workspace' },
  { label: 'Practice', href: '/practice', icon: Activity, section: 'Workspace' },
  { label: 'Projects', href: '/projects', icon: FolderKanban, section: 'Build' },
  { label: 'AI Engineer', href: '/ai-engineer', icon: Sparkles, section: 'Build', accent: true },
  { label: 'Skill graph', href: '/skills', icon: ChartNoAxesColumnIncreasing, section: 'Build' },
  { label: 'Portfolio', href: '/portfolio', icon: BriefcaseBusiness, section: 'Career' },
  { label: 'Resume', href: '/resume', icon: FileText, section: 'Career' },
  { label: 'Pricing', href: '/pricing', icon: CreditCard, section: 'Manage' },
  { label: 'Settings', href: '/settings', icon: Settings2, section: 'Manage' },
];

const commandItems = [
  { label: 'Create a project', hint: 'Generate a structured build plan', href: '/projects/new', icon: FolderKanban },
  { label: 'Start practice', hint: 'Adaptive questions for your weakest topic', href: '/practice', icon: Activity },
  { label: 'Open skill graph', hint: 'Review evidence and mastery', href: '/skills', icon: ChartNoAxesColumnIncreasing },
  { label: 'Ask the AI Engineer', hint: 'Debug or reason about a design', href: '/ai-engineer', icon: Sparkles },
  { label: 'Browse learning', hint: 'Find a topic in your branch', href: '/learn', icon: BookOpen },
  { label: 'Build my resume', hint: 'Use your actual project evidence', href: '/resume', icon: FileText },
  { label: 'Open my portfolio', hint: 'Manage public visibility', href: '/portfolio', icon: BriefcaseBusiness },
  { label: 'View plans', hint: 'Compare Free, Pro and Career', href: '/pricing', icon: CreditCard },
];

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [usage, setUsage] = useState<{ plan: string; used: number; limit: number } | null>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);

  useEffect(() => {
    fetch('/api/usage').then((res) => res.ok ? res.json() : null).then((value) => value && setUsage(value)).catch(() => undefined);
  }, []);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setPaletteOpen((open) => !open);
      }
      if (event.key === 'Escape') { setPaletteOpen(false); setMobileMenuOpen(false); }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  const filteredCommands = useMemo(() => commandItems.filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(paletteQuery.toLowerCase())), [paletteQuery]);
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  async function logout() {
    setLogoutBusy(true);
    try { await fetch('/api/auth/logout', { method: 'POST' }); } finally { router.push('/'); router.refresh(); }
  }

  function go(href: string) { setPaletteOpen(false); setMobileMenuOpen(false); setPaletteQuery(''); router.push(href); }

  return <div className="workspace-shell">
    <aside className={`sidebar${mobileMenuOpen ? ' sidebar--mobile-open' : ''}`}>
      <div className="sidebar-top"><Link className="brand-link" href="/dashboard" aria-label="NEXORA dashboard"><Brand /></Link><button className="mobile-close" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)}><X size={18} /></button></div>
      <button className="workspace-switcher" onClick={() => go('/dashboard')}>
        <span className="workspace-avatar">{(user.name || 'N').slice(0, 1).toUpperCase()}</span>
        <span className="workspace-switcher-copy"><strong>{user.name || 'Your workspace'}</strong><small>{user.branch || 'Engineering workspace'}</small></span>
        <span className="switcher-caret">⌄</span>
      </button>
      <button className="sidebar-search" onClick={() => setPaletteOpen(true)}><Search size={15} /><span>Jump to...</span><kbd>⌘ K</kbd></button>
      <nav className="main-nav" aria-label="Main navigation">
        {['Workspace', 'Build', 'Career', 'Manage'].map((section) => <div className="nav-section" key={section}>
          <p className="nav-section-title">{section}</p>
          {navItems.filter((item) => item.section === section).map(({ label, href, icon: Icon, accent }) => <Link key={href} href={href} className={`nav-link${active(href) ? ' nav-link--active' : ''}${accent ? ' nav-link--accent' : ''}`} onClick={() => setMobileMenuOpen(false)}>
            <Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label === 'AI Engineer' && <span className="nav-ai-dot" />}
          </Link>)}
        </div>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="plan-mini">
          <div className="plan-mini-top"><span className="plan-mini-icon"><Sparkles size={14} /></span><span>{usage?.plan || 'Free'} plan</span><span className="plan-mini-count">{usage ? `${usage.used}/${usage.limit}` : '—'}</span></div>
          <div className="plan-meter"><span style={{ width: `${usage ? Math.min(100, usage.used / Math.max(usage.limit, 1) * 100) : 0}%` }} /></div>
          <p>{usage ? `${Math.max(0, usage.limit - usage.used)} AI requests left this month` : 'AI request allowance'}</p>
          <Link href="/pricing" className="upgrade-link">Explore plans <ArrowUpRight size={13} /></Link>
        </div>
        <button className="user-menu" onClick={() => go('/settings')}>
          <span className="user-avatar">{(user.name || 'N').slice(0, 1).toUpperCase()}</span>
          <span className="user-menu-copy"><strong>{user.name}</strong><small>{user.email}</small></span>
          <Settings2 size={16} className="user-settings" />
        </button>
        <button className="logout-link" disabled={logoutBusy} onClick={logout}><LogOut size={15} />{logoutBusy ? 'Signing out…' : 'Sign out'}</button>
      </div>
    </aside>

    {mobileMenuOpen && <button className="mobile-backdrop" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation" />}
    <div className="workspace-main">
      <header className="workspace-topbar">
        <button className="mobile-menu-button" onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
        <div className="topbar-context"><span className="topbar-pulse" /><span>NEXORA Workspace</span><span className="topbar-divider">/</span><span className="topbar-current">{navItems.find((item) => active(item.href))?.label || 'Workspace'}</span></div>
        <div className="topbar-actions">
          <button className="topbar-command" onClick={() => setPaletteOpen(true)}><Command size={14} /><span>Search or jump to...</span><kbd>⌘ K</kbd></button>
          <Link href="/pricing" className="topbar-upgrade"><Sparkles size={14} /> Upgrade</Link>
          <button className="topbar-profile" onClick={() => go('/settings')} aria-label="Open settings">{(user.name || 'N').slice(0, 1).toUpperCase()}</button>
        </div>
      </header>
      <main className="workspace-content">{children}</main>
    </div>

    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {[navItems[0], navItems[1], navItems[3], navItems[4], navItems[9]].map(({ label, href, icon: Icon }) => <Link key={href} href={href} className={active(href) ? 'mobile-nav-active' : ''}><Icon size={18} /><span>{label === 'AI Engineer' ? 'AI' : label === 'Dashboard' ? 'Home' : label === 'Settings' ? 'Profile' : label}</span></Link>)}
    </nav>

    {paletteOpen && <div className="palette-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaletteOpen(false); }}>
      <div className="command-palette" role="dialog" aria-modal="true" aria-label="Command center">
        <div className="palette-input-wrap"><Search size={19} /><input autoFocus placeholder="What would you like to do?" value={paletteQuery} onChange={(event) => setPaletteQuery(event.target.value)} aria-label="Search actions" /><kbd>ESC</kbd></div>
        <p className="palette-label">QUICK ACTIONS</p>
        <div className="palette-results">{filteredCommands.length ? filteredCommands.map(({ label, hint, href, icon: Icon }) => <button key={href} className="palette-result" onClick={() => go(href)}><span className="palette-result-icon"><Icon size={17} /></span><span className="palette-result-copy"><strong>{label}</strong><small>{hint}</small></span><span className="palette-enter">↵</span></button>) : <div className="palette-no-results">No actions match “{paletteQuery}”</div>}</div>
        <div className="palette-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to open</span><span><Check size={12} /> all actions are available</span></div>
      </div>
    </div>}
  </div>;
}
