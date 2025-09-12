import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAuthToken, removeAuthToken } from "@/lib/auth-utils";
import type { AuthUser } from "@/types";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: !!getAuthToken(),
    retry: false,
    queryFn: async (): Promise<AuthUser | null> => {
      const token = getAuthToken();
      if (!token) return null;

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          removeAuthToken();
          return null;
        }
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
  });

  const logout = () => {
    removeAuthToken();
    queryClient.clear();
    window.location.href = '/';
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    logout,
  };
}
