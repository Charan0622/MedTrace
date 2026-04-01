"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { UserRole } from "./types";

export type AiProvider = "gemini" | "nvidia" | "none";

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
  aiProvider: AiProvider;
  aiKey: string | null;
  login: (user: SessionUser, provider: AiProvider, apiKey: string) => void;
  logout: () => void;
  isDoctor: boolean;
  isNurse: boolean;
  isLoggedIn: boolean;
  hasAi: boolean;
  aiHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  aiProvider: "none",
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
  const [aiProvider, setAiProvider] = useState<AiProvider>("none");
  const [aiKey, setAiKey] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const session = JSON.parse(saved);
        if (session.user) {
          setUser(session.user);
          setAiProvider(session.aiProvider ?? "none");
          setAiKey(session.aiKey ?? null);
        }
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  const login = useCallback((newUser: SessionUser, provider: AiProvider, apiKey: string) => {
    setUser(newUser);
    setAiProvider(provider);
    setAiKey(apiKey || null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: newUser, aiProvider: provider, aiKey: apiKey || null }));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAiProvider("none");
    setAiKey(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const hasAi = !!aiKey && aiProvider !== "none";

  const aiHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (aiKey) h["x-ai-key"] = aiKey;
    if (aiProvider !== "none") h["x-ai-provider"] = aiProvider;
    return h;
  }, [aiKey, aiProvider]);

  // Don't render children until session is loaded from storage
  if (!loaded) return null;

  return (
    <AuthContext.Provider
      value={{
        user,
        aiProvider,
        aiKey,
        login,
        logout,
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
