import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role, User } from "./types";

const AUTH_KEY = "drugreg_auth_v1";

const KEYCLOAK_URL =
  (import.meta.env.VITE_KEYCLOAK_URL as string | undefined) ??
  "http://localhost:8080";
const KEYCLOAK_REALM =
  (import.meta.env.VITE_KEYCLOAK_REALM as string | undefined) ?? "sunbird-rc";
const KEYCLOAK_CLIENT_ID =
  (import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string | undefined) ?? "admin-api";
const KEYCLOAK_CLIENT_SECRET =
  (import.meta.env.VITE_KEYCLOAK_CLIENT_SECRET as string | undefined) ??
  "d64775a0-850e-4639-aa56-9f352187cb4b";

interface AuthContextValue {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

const ROLE_CANDIDATES: Role[] = [
  "ADMIN",
  "DRUG_CONTROLLER",
  "MEDICAL_OFFICER",
  "QUALITY_OFFICER",
  "MANUFACTURER",
];

function extractRole(claims: Record<string, unknown> | null, username: string): Role {
  const collected: string[] = [];
  const realmAccess = claims?.["realm_access"] as { roles?: string[] } | undefined;
  if (realmAccess?.roles) collected.push(...realmAccess.roles);
  const resourceAccess = claims?.["resource_access"] as
    | Record<string, { roles?: string[] }>
    | undefined;
  if (resourceAccess) {
    for (const v of Object.values(resourceAccess)) {
      if (v?.roles) collected.push(...v.roles);
    }
  }
  const normalized = collected.map((r) => r.toUpperCase().replace(/[-\s]/g, "_"));
  for (const candidate of ROLE_CANDIDATES) {
    if (normalized.includes(candidate)) return candidate;
  }
  // Fallback: infer from username
  const u = username.toLowerCase();
  if (u.includes("admin")) return "ADMIN";
  if (u.includes("drugcon") || u.includes("controller")) return "DRUG_CONTROLLER";
  if (u.includes("medical") || u.startsWith("medic")) return "MEDICAL_OFFICER";
  if (u.includes("quality") || u.startsWith("qualityofc")) return "QUALITY_OFFICER";
  return "MANUFACTURER";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(AUTH_KEY) : null;
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === AUTH_KEY) {
        setUser(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const login = async (username: string, password: string) => {
    if (!username || !password) throw new Error("Username and password required");

    const tokenUrl = `${KEYCLOAK_URL}/auth/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
    const body = new URLSearchParams({
      client_id: KEYCLOAK_CLIENT_ID,
      client_secret: KEYCLOAK_CLIENT_SECRET,
      username,
      password,
      grant_type: "password",
    });

    let token: string;
    let claims: Record<string, unknown> | null = null;
    try {
      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Keycloak login failed (${res.status})${text ? `: ${text}` : ""}`,
        );
      }
      const data = (await res.json()) as { access_token?: string };
      if (!data.access_token) throw new Error("No access_token returned by Keycloak");
      token = data.access_token;
      claims = decodeJwt(token);
    } catch (err) {
      // Network/CORS failure — surface a clear message.
      throw new Error(
        (err as Error).message ||
          "Unable to reach Keycloak. Check that the server is running and CORS is enabled.",
      );
    }

    const role = extractRole(claims, username);
    const displayName =
      (claims?.["name"] as string | undefined) ||
      (claims?.["preferred_username"] as string | undefined) ||
      username;

    const authedUser: User = {
      username:
        (claims?.["preferred_username"] as string | undefined) || username,
      displayName,
      role,
      token,
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(authedUser));
    setUser(authedUser);
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
