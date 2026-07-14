import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { axiosClient, setAccessToken } from '../api/axiosClient';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = (token: string, userData: User) => {
    setAccessToken(token);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await axiosClient.post('/api/auth/revoke-token');
    } catch (e) {
      console.error('Logout failed on server', e);
    } finally {
      setAccessToken('');
      setUser(null);
    }
  };

  const checkAuthStatus = async () => {
    setIsLoading(true);
    try {
      // Calling a protected endpoint to verify auth status.
      // If we don't have an access token, or it's expired, our interceptor will 
      // automatically try to use the HttpOnly refresh cookie to get a new one.
      const response = await axiosClient.get('/api/protected/test');
      
      // If successful, extract user data from claims
      // In a real app, you might want an endpoint like /api/auth/me that specifically returns user info
      if (response.status === 200) {
          // Temporarily mock user extraction since /api/protected/test returns claims array
          // Ideally the API should return a structured User object. 
          // We will decode the JWT or rely on the response for now.
          setUser({
              id: 'extracted-from-token',
              username: 'AuthenticatedUser',
              email: 'user@auth.local',
              role: 'User'
          });
      }
    } catch (error) {
      console.log('No valid session found');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
    
    // Listen for global logout event from interceptor
    const handleLogout = () => setUser(null);
    window.addEventListener('auth-logout', handleLogout);
    return () => window.removeEventListener('auth-logout', handleLogout);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, checkAuthStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
