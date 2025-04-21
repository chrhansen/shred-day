import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { skiService, AuthenticationError } from '@/services/skiService';
import { UserInfo } from '@/types/ski'; // Assuming UserInfo contains basic user details

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserInfo | null; // Store user info if available
  checkAuthStatus: () => Promise<void>; // Function to re-check auth
  login: (user: UserInfo) => void; // Function to set user as logged in
  logout: () => Promise<void>; // Function to handle logout
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuthStatus = async () => {
    setIsLoading(true);
    try {
      // Attempt to fetch stats - this requires authentication
      // In a real app, you might have a dedicated /api/me endpoint
      const stats = await skiService.getStats();
      // If getStats succeeds, we are authenticated.
      // We don't have user info from stats, so ideally we'd fetch it.
      // For now, we just know they are authenticated.
      setIsAuthenticated(true);
      // setUser(userInfo); // TODO: Fetch actual user info if needed
    } catch (error) {
      if (error instanceof AuthenticationError) {
        setIsAuthenticated(false);
        setUser(null);
      } else {
        // Handle other errors (e.g., network error)
        console.error("Error checking auth status:", error);
        // Optionally set an error state here
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check status on initial load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Function to call after successful login
  const login = (loggedInUser: UserInfo) => {
    setIsAuthenticated(true);
    setUser(loggedInUser);
    setIsLoading(false); // No longer loading initial auth status
  };

  // Function to call for logout
  const logout = async () => {
    try {
      await skiService.signOut();
    } catch (error) {
      console.error("Error during sign out:", error);
      // Handle sign out error if necessary
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      // Optionally redirect here or let the component handle it
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, checkAuthStatus, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
