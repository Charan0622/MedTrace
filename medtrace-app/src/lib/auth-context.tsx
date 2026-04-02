"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { UserRole } from "./types";

interface SessionUser {
  id: string;
  name: string;
  role: UserRole;
  department: string;
  employee_id: string;
  email: string;
}

interface AuthContextType {
  user: SessionUser | null;
  aiKey: string | null;
  login: (user: SessionUser, apiKey: string) => void;
  logout: () => void;
  isDoctor: boolean;
  isNurse: boolean;
  isLoggedIn: boolean;
  hasAi: boolean;
  aiHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  aiKey: null,
  login: () => {},
  logout: () => {},
  isDoctor: false,
  isNurse: false,
  isLoggedIn: false,
  hasAi: false,
  aiHeaders: () => ({}),
});

const STORAGE_KEY = "medtrace_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [aiKey, setAiKey] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const session = JSON.parse(saved);
        if (session.user) {
          setUser(session.user);
          // Support legacy formats
          setAiKey(session.aiKey ?? session.nvidiaKey ?? null);
        }
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  const login = useCallback((newUser: SessionUser, apiKey: string) => {
    setUser(newUser);
    const key = apiKey.trim() || null;
    setAiKey(key);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: newUser, aiKey: key }));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAiKey(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const hasAi = !!aiKey;

  const aiHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (aiKey) h["x-ai-key"] = aiKey;
    return h;
  }, [aiKey]);

  if (!loaded) return null;

  return (
    <AuthContext.Provider
      value={{
        user, aiKey,
        login, logout,
        isDoctor: user?.role === "doctor",
        isNurse: user?.role === "nurse",
        isLoggedIn: !!user,
        hasAi,
        aiHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
