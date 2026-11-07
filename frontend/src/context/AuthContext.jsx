import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

async function parseResponse(response, fallbackMsg = 'Request failed') {
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON response (e.g. proxy timeout, empty body)
  }

  if (!response.ok) {
    const msg = data?.message || (response.status >= 502 && response.status <= 504
      ? 'Backend server is unreachable. Please ensure the backend is running on port 5000.'
      : `${fallbackMsg} (${response.status})`);
    throw new Error(msg);
  }

  return data || {};
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const persistSession = (nextToken, nextUser) => {
    localStorage.setItem('token', nextToken);
    localStorage.setItem('user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  // Verify JWT on application mount to ensure session validity
  useEffect(() => {
    let isMounted = true;

    const verifyStoredSession = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      // Optimistically populate from localStorage while verifying
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          // ignore parsing error
        }
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setUser(data.user);
            setToken(storedToken);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        } else if (response.status === 401 || response.status === 403) {
          // Token expired or invalid
          console.warn('Stored JWT session is expired or invalid. Clearing session.');
          if (isMounted) {
            logout();
          }
        }
      } catch (err) {
        console.error('Failed to verify JWT with server:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifyStoredSession();

    return () => {
      isMounted = false;
    };
  }, []);


  const login = async (email, password) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await parseResponse(response, 'Login failed');

      persistSession(data.token, data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const register = async (name, email, password, role = 'user') => {
    setError(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await parseResponse(response, 'Registration failed');

      persistSession(data.token, data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const sendOtp = async (email) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await parseResponse(response, 'Failed to send OTP');
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const verifyOtp = async (email, otp, name) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp, name }),
      });

      const data = await parseResponse(response, 'OTP verification failed');

      persistSession(data.token, data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const forgotPassword = async (email) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await parseResponse(response, 'Failed to send password reset code');
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await parseResponse(response, 'Password reset failed');

      persistSession(data.token, data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  };

  const authFetch = async (url, options = {}) => {
    const headers = {
      ...options.headers,
      ...getAuthHeaders(),
    };
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      console.warn('Received 401 Unauthorized - JWT token may be expired or invalid.');
      logout();
    }
    return response;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        error,
        login,
        register,
        sendOtp,
        verifyOtp,
        forgotPassword,
        resetPassword,
        logout,
        getAuthHeaders,
        authFetch
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

