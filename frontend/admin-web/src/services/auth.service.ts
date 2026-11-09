import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import type { AuthenticatedUser } from '../types/auth';

interface GetMeResponse {
  success: boolean;
  data: {
    user: AuthenticatedUser;
  };
}

export const authService = {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.session || !data.user) {
      throw new Error('Login berhasil tetapi sesi otentikasi tidak ditemukan.');
    }

    const profile = await this.getProfile();

    return {
      user: profile,
      session: data.session,
    };
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new Error(error.message);
    }
    return data.session;
  },

  async getProfile(): Promise<AuthenticatedUser> {
    const response = await apiFetch<GetMeResponse>('/admin/me');
    if (!response.success || !response.data?.user) {
      throw new Error('Gagal memverifikasi profil pengguna dari backend.');
    }
    return response.data.user;
  },
};