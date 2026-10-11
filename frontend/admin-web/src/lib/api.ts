import { supabase } from './supabase';

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let token: string | undefined;

  try {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
  } catch {
    // Sesi belum tersedia atau gagal dimuat
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      result?.error?.message ??
      result?.message ??
      `Terjadi kesalahan pada server (${response.status}).`;

    const error: ApiError = new Error(message);
    error.status = response.status;
    error.code = result?.error?.code;
    error.details = result?.error?.details;

    throw error;
  }

  return result as T;
}