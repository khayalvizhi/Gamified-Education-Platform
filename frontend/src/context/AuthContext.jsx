import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_URL = 'http://localhost:3001/api';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('lq_token'));
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch me on mount or token change
  const refreshMe = async (currentToken = token) => {
    if (!currentToken) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return null;
    }

    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setProfile(data.profile);
        setLoading(false);
        return data;
      } else {
        // Token invalid/expired
        logout();
      }
    } catch (err) {
      console.error('Failed to fetch user state:', err);
    }
    setLoading(false);
    return null;
  };

  useEffect(() => {
    refreshMe();
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem('lq_token', data.token);
    setToken(data.token);
    setUser(data.user);
    // Refresh me will fetch the profile automatically
    await refreshMe(data.token);
    return data;
  };

  const register = async (username, email, password, avatarUrl) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, avatar_url: avatarUrl })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    localStorage.setItem('lq_token', data.token);
    setToken(data.token);
    setUser(data.user);
    await refreshMe(data.token);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('lq_token');
    setToken(null);
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  const updateProfile = async (username, avatarUrl) => {
    if (!token || !user) return;
    const res = await fetch(`${API_URL}/profile/${user.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username, avatar_url: avatarUrl })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update profile');
    }

    // Refresh user state
    await refreshMe();
    return data;
  };

  return (
    <AuthContext.Provider value={{ token, user, profile, loading, login, register, logout, refreshMe, updateProfile, API_URL }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
