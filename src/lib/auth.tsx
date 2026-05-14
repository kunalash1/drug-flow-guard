import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role, User } from "./types";

const AUTH_KEY = "drugreg_auth_v1";

interface AuthContextValue {
  user: User | null;
  login: (username: string, password: string, role: Role) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(AUTH_KEY) : null;
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        // ignore
      }
    }
  }, []);

  const login = async (username: string, password: string, role: Role) => {
    // Mock Keycloak: in production, exchange creds for a JWT.
    if (!username || !password) throw new Error("Username and password required");
    const fake: User = {
      username,
      displayName: username.charAt(0).toUpperCase() + username.slice(1),
      role,
      token: `mock.jwt.${btoa(`${username}:${role}:${Date.now()}`)}`,
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(fake));
    setUser(fake);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
  };

  const hasRole = (...roles: Role[]) => !!user && roles.includes(user.role);

  return (
    <AuthContext.Provider value={{ user, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
