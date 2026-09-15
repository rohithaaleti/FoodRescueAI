import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

const AuthContext = createContext(null);

const decodeToken = (token) => {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));

    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const getStoredAuth = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    return { token: null, user: null };
  }

  let storedUser = null;

  try {
    storedUser = JSON.parse(localStorage.getItem("user"));
  } catch {
    localStorage.removeItem("user");
  }

  const tokenUser = decodeToken(token);

  return {
    token,
    user: tokenUser ? { ...storedUser, ...tokenUser } : storedUser,
  };
};

export const AuthProvider = ({ children }) => {
  const location = useLocation();
  const [auth, setAuth] = useState(getStoredAuth);
  const storedAuth = getStoredAuth();

  useEffect(() => {
    setAuth(storedAuth);
  }, [location.key]);

  const currentAuth = auth.token === storedAuth.token ? auth : storedAuth;

  const value = useMemo(() => ({
    ...currentAuth,
    login: ({ token, user }) => {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setAuth(getStoredAuth());
    },
    logout: () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setAuth({ token: null, user: null });
    },
  }), [currentAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
