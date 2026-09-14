import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import api from "@/lib/api";
import { logError } from "@/lib/logger";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch (error) {
      logError("Auth check failed:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // If returning from OAuth callback, skip /me — AuthCallback handles it.
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      logError("Logout request failed:", error);
    }
    setUser(null);
    window.location.href = "/login";
  }, []);

  const value = useMemo(
    () => ({ user, setUser, loading, checkAuth, logout }),
    [user, loading, checkAuth, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
