export type AppRole = 'SUPER_ADMIN' | 'TECHNICIAN';

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  role: AppRole;
  fullName: string;
}

export interface AuthState {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
