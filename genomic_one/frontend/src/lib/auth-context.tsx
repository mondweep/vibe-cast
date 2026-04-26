"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface AuthUser {
  name: string;
  email: string;
  role: string;
  initials: string;
  color: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  register: (name: string, email: string, password: string, role: string) => { success: boolean; error?: string };
  logout: () => void;
}

const STORAGE_KEY = "genomic-one-auth";
const USERS_KEY = "genomic-one-users";

const DEMO_ACCOUNTS: (AuthUser & { password: string })[] = [
  {
    name: "Demo User",
    email: "demo@genomicone.io",
    password: "demo",
    role: "Research Scientist",
    initials: "DU",
    color: "#00C9B1",
  },
  {
    name: "Dr. Sarah Chen",
    email: "sarah.chen@novo.dk",
    password: "demo",
    role: "Clinical Pharmacologist",
    initials: "SC",
    color: "#00C9B1",
  },
  {
    name: "Chris McGrath",
    email: "chris@genomicone.io",
    password: "demo",
    role: "Platform Admin",
    initials: "CM",
    color: "#3D8EFF",
  },
];

function generateInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getStoredUsers(): (AuthUser & { password: string })[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

function saveStoredUsers(users: (AuthUser & { password: string })[]) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

function getAllAccounts(): (AuthUser & { password: string })[] {
  return [...DEMO_ACCOUNTS, ...getStoredUsers()];
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  login: () => ({ success: false }),
  register: () => ({ success: false }),
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const login = useCallback((email: string, password: string) => {
    const accounts = getAllAccounts();
    const match = accounts.find(
      (a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password
    );
    if (!match) {
      return { success: false, error: "Invalid email or password" };
    }
    const { password: _, ...userData } = match;
    setUser(userData);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    } catch {
      // ignore
    }
    return { success: true };
  }, []);

  const register = useCallback(
    (name: string, email: string, password: string, role: string) => {
      const accounts = getAllAccounts();
      if (accounts.find((a) => a.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, error: "An account with this email already exists" };
      }
      const colors = ["#00C9B1", "#3D8EFF", "#8B5CF6", "#F0B429"];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const newUser = {
        name,
        email,
        password,
        role,
        initials: generateInitials(name),
        color,
      };
      const stored = getStoredUsers();
      stored.push(newUser);
      saveStoredUsers(stored);

      const { password: _, ...userData } = newUser;
      setUser(userData);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      } catch {
        // ignore
      }
      return { success: true };
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  if (!mounted) {
    return (
      <AuthContext.Provider
        value={{ user: null, isAuthenticated: false, login, register, logout }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
