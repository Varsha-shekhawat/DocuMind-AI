import { createContext, useContext, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, type User, ApiError } from './api-client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  register: (data: { name: string; email: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Query authenticated session from /api/auth/me
  const { data, isLoading } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      try {
        const response = await authApi.getMe();
        return response.user;
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 401) {
          return null;
        }
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      queryClient.setQueryData(['auth-user'], response.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (response) => {
      queryClient.setQueryData(['auth-user'], response.user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(['auth-user'], null);
      queryClient.invalidateQueries({ queryKey: ['auth-user'] });
    },
  });

  const user = data ?? null;

  const login = async (credentials: { email: string; password: string }): Promise<User> => {
    const result = await loginMutation.mutateAsync(credentials);
    return result.user;
  };

  const register = async (data: { name: string; email: string; password: string }): Promise<User> => {
    const result = await registerMutation.mutateAsync(data);
    return result.user;
  };

  const logout = async (): Promise<void> => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
