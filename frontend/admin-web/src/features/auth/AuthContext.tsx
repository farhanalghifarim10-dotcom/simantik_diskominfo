import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../../lib/supabase';
import { authService } from '../../services/auth.service';
import type { AuthenticatedUser } from '../../types/auth';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await authService.getProfile();
      setUser(profile);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session && isMounted) {
          const profile = await authService.getProfile();
          if (isMounted) setUser(profile);
        } else if (isMounted) {
          setUser(null);
        }
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' && session) {
        try {
          const profile = await authService.getProfile();
          if (isMounted) setUser(profile);
        } catch {
          if (isMounted) setUser(null);
        }
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) setUser(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const result = await authService.login(email, password);
    setUser(result.user);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
