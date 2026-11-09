import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppRole } from '../auth/auth.types.js';

export interface LocalTestUserSpec {
  email: string;
  fullName: string;
  role: AppRole;
  password?: string;
  description: string;
}

export interface ProvisionResult {
  email: string;
  role: AppRole;
  fullName: string;
  userId: string;
  authAction: 'CREATED' | 'UPDATED' | 'UNCHANGED';
  profileAction: 'CREATED' | 'UPDATED' | 'VERIFIED';
}

export const LOCAL_SUPABASE_DEFAULT_PORT = '54321';
export const ALLOWED_LOCAL_HOSTS = ['127.0.0.1', 'localhost'];

export const DEFAULT_LOCAL_TEST_USERS: LocalTestUserSpec[] = [
  {
    email: 'superadmin.local@simantik.test',
    fullName: 'Super Administrator SIMANTIK',
    role: 'SUPER_ADMIN',
    description: 'Akun Super Admin Lokal (Akses Penuh)',
  },
  {
    email: 'tenagaahli.local@simantik.test',
    fullName: 'Tenaga Ahli SIMANTIK',
    role: 'TECHNICIAN',
    description: 'Akun Tenaga Ahli Lokal (Workspace Teknisi)',
  },
];

export function validateSupabaseLocalUrl(urlStr: string | undefined): { url: string; host: string; port: string } {
  if (!urlStr || typeof urlStr !== 'string' || urlStr.trim() === '') {
    throw new Error(
      'CONFIG ERROR: SUPABASE_URL belum didefinisikan. ' +
      'Harap berikan URL Supabase lokal melalui environment variable (misal: http://127.0.0.1:54321).'
    );
  }

  const trimmed = urlStr.trim();
  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch (err: any) {
    throw new Error(`CONFIG ERROR: Format SUPABASE_URL tidak valid: "${trimmed}". Pesan: ${err.message}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`SECURITY ERROR: Protokol "${parsed.protocol}" tidak diizinkan. Gunakan http:// atau https://.`);
  }

  const hostname = parsed.hostname.toLowerCase();

  if (hostname.endsWith('.supabase.co') || hostname.includes('supabase.co')) {
    throw new Error(
      `SECURITY VIOLATION: Terdeteksi URL Supabase Cloud ("${hostname}"). ` +
      `Skrip lokal dilarang keras berinteraksi dengan database produksi/cloud!`
    );
  }

  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(
      `SECURITY VIOLATION: Host "${hostname}" bukan host lokal yang diizinkan! ` +
      `Hanya "${ALLOWED_LOCAL_HOSTS.join('" dan "')}" yang diperbolehkan untuk pengujian lokal.`
    );
  }

  const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
  if (port !== LOCAL_SUPABASE_DEFAULT_PORT) {
    throw new Error(
      `PORT MISMATCH: Port API "${port}" tidak sesuai dengan konfigurasi Supabase lokal (${LOCAL_SUPABASE_DEFAULT_PORT}). ` +
      `Pastikan URL mengarah ke gateway API lokal, contoh: http://127.0.0.1:${LOCAL_SUPABASE_DEFAULT_PORT}`
    );
  }

  return {
    url: parsed.origin,
    host: hostname,
    port,
  };
}

export function validateTestEmail(email: string): void {
  if (!email || !email.toLowerCase().endsWith('.test')) {
    throw new Error(
      `SAFETY ERROR: Email pengujian "${email}" wajib menggunakan TLD ".test" ` +
      `untuk mencegah pengiriman email nyata atau benturan dengan akun riil.`
    );
  }
}

export function resolveExecutionConfig(env: NodeJS.ProcessEnv = process.env) {
  const rawUrl = env.LOCAL_SUPABASE_URL || env.SUPABASE_URL;
  const validated = validateSupabaseLocalUrl(rawUrl);

  const serviceRoleKey = env.LOCAL_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey || serviceRoleKey.trim() === '') {
    throw new Error(
      'CONFIG ERROR: Service role key belum diberikan. ' +
      'Set environment variable LOCAL_SUPABASE_SERVICE_ROLE_KEY atau SUPABASE_SERVICE_ROLE_KEY saat menjalankan skrip.'
    );
  }

  const superAdminPassword = env.LOCAL_SUPER_ADMIN_PASSWORD || env.LOCAL_TEST_PASSWORD;
  const technicianPassword = env.LOCAL_TECHNICIAN_PASSWORD || env.LOCAL_TEST_PASSWORD;

  return {
    supabaseUrl: validated.url,
    serviceRoleKey: serviceRoleKey.trim(),
    superAdminPassword: superAdminPassword?.trim(),
    technicianPassword: technicianPassword?.trim(),
  };
}

export function createLocalAdminClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export async function provisionLocalUser(
  client: SupabaseClient,
  spec: LocalTestUserSpec
): Promise<ProvisionResult> {
  validateTestEmail(spec.email);

  if (!spec.password || spec.password.length < 8) {
    throw new Error(
      `PASSWORD ERROR: Password untuk akun "${spec.email}" wajib diisi dan minimal 8 karakter. ` +
      `Sediakan melalui environment variable.`
    );
  }

  const { data: listData, error: listError } = await client.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw new Error(`AUTH ERROR: Gagal mengambil daftar pengguna dari Auth Admin API: ${listError.message}`);
  }

  const existingAuthUser = listData.users.find(
    (u) => u.email?.toLowerCase() === spec.email.toLowerCase()
  );

  let userId: string;
  let authAction: 'CREATED' | 'UPDATED' | 'UNCHANGED';

  if (!existingAuthUser) {
    const { data: createData, error: createError } = await client.auth.admin.createUser({
      email: spec.email,
      password: spec.password,
      email_confirm: true,
      user_metadata: {
        full_name: spec.fullName,
      },
    });

    if (createError || !createData.user) {
      throw new Error(`AUTH ERROR: Gagal membuat user di Auth: ${createError?.message}`);
    }

    userId = createData.user.id;
    authAction = 'CREATED';
  } else {
    userId = existingAuthUser.id;

    const { error: updateError } = await client.auth.admin.updateUserById(userId, {
      password: spec.password,
      email_confirm: true,
      user_metadata: {
        ...existingAuthUser.user_metadata,
        full_name: spec.fullName,
      },
    });

    if (updateError) {
      throw new Error(`AUTH ERROR: Gagal memperbarui user yang sudah ada di Auth: ${updateError.message}`);
    }

    authAction = 'UPDATED';
  }

  const { data: existingProfile, error: profileFetchError } = await client
    .from('profiles')
    .select('id, full_name, role, is_active, email')
    .eq('id', userId)
    .maybeSingle();

  if (profileFetchError) {
    throw new Error(`DB ERROR: Gagal memeriksa profil "${spec.email}": ${profileFetchError.message}`);
  }

  let profileAction: 'CREATED' | 'UPDATED' | 'VERIFIED';

  if (!existingProfile) {
    const { error: insertError } = await client.from('profiles').insert({
      id: userId,
      full_name: spec.fullName,
      role: spec.role,
      is_active: true,
      email: spec.email,
    });

    if (insertError) {
      throw new Error(`DB ERROR: Gagal menambahkan profil di public.profiles: ${insertError.message}`);
    }

    profileAction = 'CREATED';
  } else {
    if (existingProfile.role !== spec.role) {
      throw new Error(
        `ROLE CONFLICT VIOLATION: Profil untuk user "${spec.email}" sudah memiliki role "${existingProfile.role}", ` +
        `tetapi skrip mencoba mengatur menjadi "${spec.role}". ` +
        `Sistem menolak mengubah role pengguna yang sudah ada secara diam-diam. ` +
        `Ubah role secara manual jika eskalasi/perubahan peran memang dikehendaki.`
      );
    }

    const needsUpdate =
      !existingProfile.is_active ||
      existingProfile.full_name !== spec.fullName ||
      existingProfile.email !== spec.email;

    if (needsUpdate) {
      const { error: updateProfileError } = await client
        .from('profiles')
        .update({
          is_active: true,
          full_name: spec.fullName,
          email: spec.email,
        })
        .eq('id', userId);

      if (updateProfileError) {
        throw new Error(`DB ERROR: Gagal memperbarui profil: ${updateProfileError.message}`);
      }
      profileAction = 'UPDATED';
    } else {
      profileAction = 'VERIFIED';
    }
  }

  return {
    email: spec.email,
    role: spec.role,
    fullName: spec.fullName,
    userId,
    authAction,
    profileAction,
  };
}
