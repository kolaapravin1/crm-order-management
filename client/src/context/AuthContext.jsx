import {
  createContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import * as authService from "../services/authService";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("crm_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("crm_token")) return;
    authService
      .getMe()
      .then(({ user: currentUser }) => {
        localStorage.setItem("crm_user", JSON.stringify(currentUser));
        setUser(currentUser);
      })
      .catch(() => undefined);
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { token, user: loggedInUser } = await authService.login(
        email,
        password,
      );
      localStorage.setItem("crm_token", token);
      localStorage.setItem("crm_user", JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      return loggedInUser;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("crm_token");
    localStorage.removeItem("crm_user");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isSuperadmin: user?.role === "SUPERADMIN",
      isAdmin: user?.role === "ADMIN",
    }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
