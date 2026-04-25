"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import BrainSidebar from "@/components/BrainSidebar";
import InviteModal from "@/components/InviteModal";
import { useAuth } from "@/lib/auth-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Auth pages get a minimal layout — no sidebar, no header
  if (pathname.startsWith("/auth")) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* In Silico Banner */}
      <div
        className="py-1.5 text-center font-mono text-xs"
        style={{ background: '#1A1200', borderBottom: '1px solid var(--accent-gold)', color: 'var(--accent-gold)' }}
      >
        <span className="font-semibold text-sm tracking-wide">IN SILICO</span>
        <span className="mx-2 hidden sm:inline">&middot;</span>
        <span className="hidden sm:inline">Computational simulation — no real patient data is used or stored</span>
      </div>

      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between">
          {/* Left: spacer for sidebar alignment */}
          <div className="w-[60px] md:hidden" />

          {/* Center: Status Badges */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded font-mono" style={{ color: 'var(--streaming-pulse)', background: 'rgba(0,201,177,0.1)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse-live" style={{ background: 'var(--streaming-pulse)' }} />
              MidStream Live
            </span>
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded font-mono" style={{ color: 'var(--safla-green)', background: 'rgba(0,229,160,0.1)' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>
              SAFLA Active
            </span>
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded font-mono" style={{ color: 'var(--federation-node)', background: 'rgba(61,142,255,0.1)' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="8,1 14.93,5 14.93,11 8,15 1.07,11 1.07,5"/></svg>
              5/5 Nodes
            </span>
            <span className="text-xs px-2.5 py-1 rounded font-mono" style={{ color: 'var(--text-secondary)', background: 'rgba(122,156,199,0.1)' }}>
              FACT-Augmented
            </span>
          </div>

          {/* Right: Auth + Actions */}
          <div className="flex items-center gap-2">
            <Button
              as={Link}
              href="/brain/simulate"
              size="sm"
              variant="flat"
              className="font-mono text-xs hidden sm:flex"
              style={{ color: 'var(--accent-teal)', background: 'rgba(0,201,177,0.1)' }}
            >
              + New Simulation
            </Button>

            {isAuthenticated && user ? (
              <Dropdown
                classNames={{
                  content: "bg-[var(--bg-surface)] border border-[var(--bg-border)]",
                }}
              >
                <DropdownTrigger>
                  <button className="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors hover:bg-white/5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: `${user.color}20`,
                        color: user.color,
                        border: `1.5px solid ${user.color}40`,
                      }}
                    >
                      {user.initials}
                    </div>
                    <span
                      className="text-sm font-medium hidden sm:block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {user.name}
                    </span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="hidden sm:block"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="User menu"
                  onAction={(key) => {
                    if (key === "invite") setInviteOpen(true);
                    if (key === "signout") logout();
                  }}
                >
                  <DropdownItem
                    key="invite"
                    className="text-[var(--text-primary)]"
                    startContent={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                        <line x1="20" y1="8" x2="20" y2="14" />
                        <line x1="23" y1="11" x2="17" y2="11" />
                      </svg>
                    }
                  >
                    Invite Colleague
                  </DropdownItem>
                  <DropdownItem
                    key="signout"
                    className="text-[var(--accent-red)]"
                    color="danger"
                    startContent={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                    }
                  >
                    Sign Out
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            ) : (
              <>
                <Button
                  as={Link}
                  href="/auth/login"
                  size="sm"
                  variant="bordered"
                  className="font-mono text-xs"
                  style={{ borderColor: 'var(--bg-border)', color: 'var(--text-secondary)' }}
                >
                  Log In
                </Button>
                <Button
                  as={Link}
                  href="/auth/register"
                  size="sm"
                  className="font-mono text-xs"
                  style={{ background: 'var(--accent-teal)', color: '#090E1A' }}
                >
                  Register
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex min-h-screen">
        <BrainSidebar />
        <main 
          className="flex-1 min-w-0 transition-all duration-200"
          style={{ paddingLeft: 'var(--sidebar-width, 60px)' }}
        >
          <div className="max-w-[1900px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Invite Modal */}
      <InviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
