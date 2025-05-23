import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { AuthenticationError } from '@/services/skiService';
import { accountService } from '@/services/accountService';
import { AccountDetails } from '@/types/ski';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AccountDetails | null; // Store account details including season_start_day and available_seasons
  checkAuthStatus: () => Promise<void>; // Function to re-check auth
  login: (user: AccountDetails) => void; // Function to set user as logged in
  logout: () => Promise<void>; // Function to handle logout
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<AccountDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuthStatus = async () => {
    setIsLoading(true);
    try {
      // Attempt to fetch account details - this requires authentication
      const accountDetails = await accountService.getAccountDetails();
      // If getAccountDetails succeeds, we are authenticated and have user info
      setIsAuthenticated(true);
      setUser(accountDetails);
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
  const login = (loggedInUser: AccountDetails) => {
    setIsAuthenticated(true);
    setUser(loggedInUser);
    setIsLoading(false); // No longer loading initial auth status
  };

  // Function to call for logout
  const logout = async () => {
    try {
      const { skiService } = await import('@/services/skiService');
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
