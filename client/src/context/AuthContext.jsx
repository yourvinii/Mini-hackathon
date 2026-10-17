import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, getMe as apiGetMe, setAuthToken, clearAuthToken, getAuthToken } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiGetMe();
        setUser(response.user);
      } catch (err) {
        console.warn('[Auth] Token invalid or expired, clearing session:', err.message);
        clearAuthToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const loginUser = async (email, password) => {
    const data = await apiLogin({ email, password });
    setAuthToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logoutUser = () => {
    clearAuthToken();
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isTeacher: user?.role === 'TEACHER',
    isStudent: user?.role === 'STUDENT',
    loginUser,
    logoutUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
