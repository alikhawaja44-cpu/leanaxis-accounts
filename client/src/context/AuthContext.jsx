// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('leanaxis_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Verify token on app load
  useEffect(() => {
    const token = localStorage.getItem('leanaxis_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    authAPI.me()
      .then(res => {
        setUser(res.data);
        localStorage.setItem('leanaxis_user', JSON.stringify(res.data));
      })
      .catch(() => {
        localStorage.removeItem('leanaxis_token');
        localStorage.removeItem('leanaxis_user');
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Listen for forced logouts (401 responses)
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  const login = useCallback(async (loginInput, password) => {
    setAuthError(null);
    try {
      const res = await authAPI.login(loginInput, password);
      const { token, user: userData } = res.data;
      localStorage.setItem('leanaxis_token', token);
      localStorage.setItem('leanaxis_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Please try again.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('leanaxis_token');
    localStorage.removeItem('leanaxis_user');
    setUser(null);
    setAuthError(null);
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    authError,
    setAuthError,
    login,
    logout,
    canWrite: user?.role === 'Admin' || user?.role === 'Editor',
    canDelete: user?.role === 'Admin',
    isAdmin: user?.role === 'Admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
