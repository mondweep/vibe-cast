"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Tooltip } from "@heroui/react";
import { Squash as Hamburger } from "hamburger-react";
import { motion, AnimatePresence } from "framer-motion";
import DnaLogo from "@/components/DnaLogo";
import { useAuth } from "@/lib/auth-context";

const STORAGE_KEY = "brain-sidebar-collapsed";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  heading?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        ),
      },
      {
        label: "Simulations",
        href: "/brain/simulate",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3h6v2H9zM12 5v3M5.5 8h13l-1.5 13H7z" />
            <circle cx="10" cy="14" r="1" />
            <circle cx="14" cy="14" r="1" />
            <line x1="10" y1="17" x2="14" y2="17" />
          </svg>
        ),
      },
      {
        label: "Research Pods",
        href: "/brain/pods",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="3" />
            <circle cx="6" cy="16" r="3" />
            <circle cx="18" cy="16" r="3" />
            <line x1="12" y1="11" x2="6" y2="13" />
            <line x1="12" y1="11" x2="18" y2="13" />
            <line x1="6" y1="16" x2="18" y2="16" />
          </svg>
        ),
      },
    ],
  },
  {
    heading: "Brain",
    items: [
      {
        label: "Memories",
        href: "/brain/memories",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
        ),
      },
      {
        label: "Learning",
        href: "/brain/learning",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        ),
      },
      {
        label: "Pathways",
        href: "/brain/pathways",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="2" />
            <circle cx="4" cy="6" r="2" />
            <circle cx="20" cy="6" r="2" />
            <circle cx="4" cy="18" r="2" />
            <circle cx="20" cy="18" r="2" />
            <line x1="6" y1="7" x2="10.5" y2="10.5" />
            <line x1="18" y1="7" x2="13.5" y2="10.5" />
            <line x1="6" y1="17" x2="10.5" y2="13.5" />
            <line x1="18" y1="17" x2="13.5" y2="13.5" />
          </svg>
        ),
      },
      {
        label: "Advisory",
        href: "/brain/advisory",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="9" y1="18" x2="15" y2="18" />
            <line x1="10" y1="22" x2="14" y2="22" />
            <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14" />
          </svg>
        ),
      },
    ],
  },
  {
    heading: "System",
    items: [
      {
        label: "Intelligence",
        href: "/brain/intelligence",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        ),
      },
      {
        label: "Federation",
        href: "/brain/federation",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          </svg>
        ),
      },
      {
        label: "Architecture",
        href: "/brain/architecture",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="4" rx="1" />
            <rect x="5" y="9" width="14" height="3" rx="1" />
            <rect x="5" y="14" width="14" height="3" rx="1" />
            <rect x="3" y="19" width="18" height="2" rx="1" />
          </svg>
        ),
      },
    ],
  },
];

const CREATE_OPTIONS = [
  { label: "Simulation", desc: "In silico patient case study", href: "/brain/simulate/new", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6v2H9zM12 5v3M5.5 8h13l-1.5 13H7z" />
    </svg>
  )},
  { label: "Research Pod", desc: "Autonomous agent swarm for genomic research", href: "/brain/pods", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
    </svg>
  )},
  { label: "Report", desc: "Generate clinical decision report", href: "/brain/advisory", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )},
];

function CreateButton({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);

  if (collapsed) {
    return (
      <Tooltip content="Create" placement="right">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center justify-center rounded-full py-2 mb-2 mx-auto w-10 h-10 transition-all duration-150"
          style={{ background: 'white', color: 'black' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11 5v6H5v2h6v6h2v-6h6v-2h-6V5z" /></svg>
        </button>
      </Tooltip>
    );
  }

  return (
    <div className="relative mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center gap-2.5 w-full rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-150"
        style={{
          background: 'transparent',
          border: '1.5px solid var(--bg-border)',
          color: 'var(--text-primary)',
        }}
      >
        <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 dark:bg-white dark:text-black bg-black text-white">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M11 5v6H5v2h6v6h2v-6h6v-2h-6V5z" /></svg>
        </span>
        Create
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
          >
            {CREATE_OPTIONS.map((opt, i) => (
              <Link
                key={opt.label}
                href={opt.href}
                onClick={() => { setOpen(false); onNavigate(); }}
                className="flex items-start gap-3 px-4 py-3 transition-colors duration-100 hover:bg-white/5"
                style={{ borderTop: i > 0 ? '1px solid var(--bg-border)' : 'none' }}
              >
                <span className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-teal)' }}>{opt.icon}</span>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--accent-teal)' }}>{opt.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{opt.desc}</div>
                </div>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarUserInfo({ collapsed, isMobile }: { collapsed: boolean; isMobile: boolean }) {
  const { user, isAuthenticated } = useAuth();

  if (collapsed && !isMobile) {
    if (!isAuthenticated || !user) return null;
    return (
      <Tooltip content={user.name} placement="right">
        <div className="flex justify-center py-3 border-t border-border">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{
              background: `${user.color}20`,
              color: user.color,
              border: `1.5px solid ${user.color}40`,
            }}
          >
            {user.initials}
          </div>
        </div>
      </Tooltip>
    );
  }

  return (
    <div className="mt-auto border-t border-border px-3 py-3">
      {isAuthenticated && user ? (
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={{
              background: `${user.color}20`,
              color: user.color,
              border: `1.5px solid ${user.color}40`,
            }}
          >
            {user.initials}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {user.name}
            </div>
            <div className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
              {user.role}
            </div>
          </div>
        </div>
      ) : (
        <Link
          href="/auth/login"
          className="flex items-center gap-2 text-xs font-medium transition-colors hover:text-zinc-200"
          style={{ color: "var(--text-secondary)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          Sign In
        </Link>
      )}
    </div>
  );
}

export default function BrainSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setCollapsed(stored === "true");
      }
    } catch {
      // localStorage unavailable, default to expanded
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const sidebarWidth = collapsed ? 60 : 280;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "";
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem, isMobile: boolean) => {
    const active = isActive(item.href);
    const linkContent = (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => isMobile && setMobileOpen(false)}
        className={`
          flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium
          transition-colors duration-150
          ${active
            ? "text-accent"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
          }
          ${collapsed && !isMobile ? "justify-center px-0" : ""}
        `}
        style={active ? { background: 'rgba(0,201,177,0.1)', borderLeft: '2px solid var(--accent-teal)' } : {}}
      >
        <span className="flex-shrink-0">{item.icon}</span>
        {(!collapsed || isMobile) && (
              <span className="flex items-center gap-2">
                {item.label}
                {item.href === "/brain/architecture" && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: 'var(--accent-gold)', background: 'rgba(240,180,41,0.1)' }}>DEV</span>
                )}
              </span>
            )}
      </Link>
    );

    if (collapsed && !isMobile) {
      return (
        <Tooltip key={item.href} content={item.label} placement="right">
          {linkContent}
        </Tooltip>
      );
    }
    return <span key={item.href}>{linkContent}</span>;
  };

  const navContent = (isMobile: boolean) => (
    <nav className="flex flex-col px-2 py-2">
      {/* Create button with flyout */}
      <CreateButton collapsed={collapsed && !isMobile} onNavigate={() => isMobile && setMobileOpen(false)} />
      {navSections.map((section, si) => (
        <div key={si} className={si > 0 ? "mt-2" : ""}>
          {section.heading && !collapsed && (
            <div
              className="font-mono text-[0.65rem] uppercase tracking-[0.15em] px-3 pt-3 pb-1.5"
              style={{ color: 'var(--text-muted)' }}
            >
              {section.heading}
            </div>
          )}
          {section.heading && collapsed && !isMobile && (
            <div className="border-t border-border my-1 mx-2" />
          )}
          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => renderNavItem(item, isMobile))}
          </div>
        </div>
      ))}
    </nav>
  );

  if (!mounted) {
    return <div style={{ width: 280 }} className="hidden md:block flex-shrink-0" />;
  }

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarWidth }}
        style={{ "--sidebar-width": `${sidebarWidth}px` } as any}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden md:flex flex-col flex-shrink-0 h-screen fixed left-0 top-0 border-r border-border bg-surface/80 backdrop-blur-sm overflow-hidden z-40"
      >
        {/* Sidebar header: Logo + App Name */}
        <div className={`flex items-center border-b border-border min-h-[64px] ${collapsed ? 'flex-col gap-1 px-1 py-2' : 'px-3 py-3 gap-3'}`}>
          <Link href="/" className={`flex items-center min-w-0 ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <DnaLogo className={`flex-shrink-0 ${collapsed ? 'w-[36px] h-[36px]' : 'w-[42px] h-[42px]'}`} />
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-mono text-base font-bold tracking-tight whitespace-nowrap"
                style={{ color: 'var(--text-primary)' }}
              >
                GENOMIC ONE
              </motion.span>
            )}
          </Link>
          <Button
            isIconOnly
            variant="light"
            size="sm"
            onPress={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`text-zinc-400 hover:text-zinc-200 ${collapsed ? '' : 'ml-auto'}`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Button>
        </div>

        {navContent(false)}
        <SidebarUserInfo collapsed={collapsed} isMobile={false} />
      </motion.aside>

      {/* Mobile hamburger button — fixed top-left */}
      <div className="md:hidden fixed top-3 left-3 z-[60]">
        <Hamburger
          toggled={mobileOpen}
          toggle={setMobileOpen}
          size={22}
          color="#a1a1aa"
          label="Toggle navigation"
        />
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 bg-black/60 z-[55]"
              onClick={() => setMobileOpen(false)}
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="md:hidden fixed top-0 left-0 bottom-0 w-[280px] bg-surface border-r border-border z-[58] flex flex-col overflow-y-auto"
            >
              <div className="flex items-center gap-2 px-4 py-4 border-b border-border min-h-[56px]">
                <DnaLogo className="w-[42px] h-[42px]" />
                <span className="font-mono text-base font-bold" style={{ color: 'var(--text-primary)' }}>GENOMIC ONE</span>
              </div>
              {navContent(true)}
              <SidebarUserInfo collapsed={false} isMobile={true} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
