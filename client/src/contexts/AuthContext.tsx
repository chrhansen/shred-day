import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient, QueryKey } from '@tanstack/react-query';
import { accountService } from '@/services/accountService';
import { AuthenticationError } from '@/services/skiService'; // Assuming this is a custom error type
import { AccountDetails } from '@/types/ski';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AccountDetails | null;
  checkAuthStatus: () => Promise<void>;
  login: (user: AccountDetails) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const accountDetailsQueryKey: QueryKey = ['accountDetails'];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  const { data: user, isLoading: queryIsLoading, isError, error: queryError, refetch } = useQuery<AccountDetails, Error>({
    queryKey: accountDetailsQueryKey,
    queryFn: async () => {
      try {
        return await accountService.getAccountDetails();
      } catch (error) {
        if (error instanceof AuthenticationError) {
          // Don't throw auth errors, let them result in no user data / !isAuthenticated
          return null; // Or undefined, handled by how `user` is used
        }
        throw error; // Re-throw other errors for React Query to handle
      }
    },
    retry: (failureCount, error) => {
      if (error instanceof AuthenticationError) return false;
      return failureCount < 2; // Retry other errors (e.g. network) a couple of times
    },
    staleTime: 5 * 60 * 1000, // User data is reasonably stable for 5 mins
    refetchOnWindowFocus: true, // Standard behavior, good for session validation
  });

  const isAuthenticated = !!user && !isError; // User exists and no query error (especially not auth error)

  const checkAuthStatus = async () => {
    await refetch();
  };

  const login = (loggedInUser: AccountDetails) => {
    queryClient.setQueryData(accountDetailsQueryKey, loggedInUser);
  };

  const logout = async () => {
    try {
      // Perform the server-side sign out
      const { skiService } = await import('@/services/skiService'); // Dynamic import if needed
      await skiService.signOut();
    } catch (error) {
      console.error("Error during sign out:", error);
    } finally {
      // Clear user data from React Query cache
      queryClient.setQueryData(accountDetailsQueryKey, null);
      // Optionally, fully remove the query to reset its state if needed
      // queryClient.removeQueries({ queryKey: accountDetailsQueryKey });
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading: queryIsLoading,
      user: user || null, // Provide null if user is undefined from query
      checkAuthStatus,
      login,
      logout
    }}>
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
