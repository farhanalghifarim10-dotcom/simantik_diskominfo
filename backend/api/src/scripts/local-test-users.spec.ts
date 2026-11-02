import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_LOCAL_TEST_USERS,
  LOCAL_SUPABASE_DEFAULT_PORT,
  provisionLocalUser,
  resolveExecutionConfig,
  validateSupabaseLocalUrl,
  validateTestEmail,
} from './local-test-users.js';

describe('Local Test Users Provisioning Safeguards', () => {
  describe('1. SUPABASE_URL Validation & Cloud Blocking', () => {
    it('menerima URL lokal 127.0.0.1 dengan port 54321', () => {
      const res = validateSupabaseLocalUrl('http://127.0.0.1:54321');
      expect(res.host).toBe('127.0.0.1');
      expect(res.port).toBe(LOCAL_SUPABASE_DEFAULT_PORT);
      expect(res.url).toBe('http://127.0.0.1:54321');
    });

    it('menerima URL lokal localhost dengan port 54321', () => {
      const res = validateSupabaseLocalUrl('http://localhost:54321');
      expect(res.host).toBe('localhost');
      expect(res.port).toBe(LOCAL_SUPABASE_DEFAULT_PORT);
      expect(res.url).toBe('http://localhost:54321');
    });

    it('menolak keras URL Supabase Cloud (*.supabase.co)', () => {
      expect(() => {
        validateSupabaseLocalUrl('https://sxzfwjapdlgvxkcnufmw.supabase.co');
      }).toThrow(/SECURITY VIOLATION.*Supabase Cloud/);

      expect(() => {
        validateSupabaseLocalUrl('https://any-project.supabase.co');
      }).toThrow(/SECURITY VIOLATION.*Supabase Cloud/);
    });

    it('menolak host remote atau IP non-lokal', () => {
      expect(() => {
        validateSupabaseLocalUrl('http://192.168.1.100:54321');
      }).toThrow(/SECURITY VIOLATION.*bukan host lokal/);

      expect(() => {
        validateSupabaseLocalUrl('http://api.simantik.bandungkab.go.id:54321');
      }).toThrow(/SECURITY VIOLATION.*bukan host lokal/);
    });

    it('menolak port yang tidak sesuai dengan gateway API lokal Supabase', () => {
      // Port DB 54322
      expect(() => {
        validateSupabaseLocalUrl('http://127.0.0.1:54322');
      }).toThrow(/PORT MISMATCH/);

      // Port Studio 54323
      expect(() => {
        validateSupabaseLocalUrl('http://127.0.0.1:54323');
      }).toThrow(/PORT MISMATCH/);

      // Port default web 80 / 3000
      expect(() => {
        validateSupabaseLocalUrl('http://127.0.0.1:3000');
      }).toThrow(/PORT MISMATCH/);
    });

    it('menolak protokol yang tidak valid', () => {
      expect(() => {
        validateSupabaseLocalUrl('ftp://127.0.0.1:54321');
      }).toThrow(/SECURITY ERROR.*Protokol/);
    });

    it('menolak jika SUPABASE_URL kosong atau tidak terdefinisi', () => {
      expect(() => {
        validateSupabaseLocalUrl(undefined);
      }).toThrow(/CONFIG ERROR: SUPABASE_URL belum didefinisikan/);

      expect(() => {
        validateSupabaseLocalUrl('');
      }).toThrow(/CONFIG ERROR: SUPABASE_URL belum didefinisikan/);
    });
  });

  describe('2. Safety Checks & Environment Resolution', () => {
    it('memvalidasi email harus berakhiran .test', () => {
      expect(() => validateTestEmail('superadmin.local@simantik.test')).not.toThrow();
      expect(() => validateTestEmail('user@gmail.com')).toThrow(/SAFETY ERROR.*\.test/);
      expect(() => validateTestEmail('admin@bandungkab.go.id')).toThrow(/SAFETY ERROR.*\.test/);
    });

    it('melempar error jika service role key tidak ada di environment', () => {
      const mockEnv = {
        LOCAL_SUPABASE_URL: 'http://127.0.0.1:54321',
      };
      expect(() => resolveExecutionConfig(mockEnv)).toThrow(/Service role key belum diberikan/);
    });

    it('berhasil memetakan konfigurasi environment ketika variabel valid', () => {
      const mockEnv = {
        LOCAL_SUPABASE_URL: 'http://127.0.0.1:54321',
        LOCAL_SUPABASE_SERVICE_ROLE_KEY: 'mock-secret-service-role-key',
        LOCAL_SUPER_ADMIN_PASSWORD: 'super-admin-secure-pass',
        LOCAL_TECHNICIAN_PASSWORD: 'technician-secure-pass',
      };
      const resolved = resolveExecutionConfig(mockEnv);
      expect(resolved.supabaseUrl).toBe('http://127.0.0.1:54321');
      expect(resolved.serviceRoleKey).toBe('mock-secret-service-role-key');
      expect(resolved.superAdminPassword).toBe('super-admin-secure-pass');
      expect(resolved.technicianPassword).toBe('technician-secure-pass');
    });

    it('mendukung LOCAL_TEST_PASSWORD sebagai fallback password bersama', () => {
      const mockEnv = {
        LOCAL_SUPABASE_URL: 'http://127.0.0.1:54321',
        LOCAL_SUPABASE_SERVICE_ROLE_KEY: 'mock-secret-service-role-key',
        LOCAL_TEST_PASSWORD: 'shared-secure-password-123',
      };
      const resolved = resolveExecutionConfig(mockEnv);
      expect(resolved.superAdminPassword).toBe('shared-secure-password-123');
      expect(resolved.technicianPassword).toBe('shared-secure-password-123');
    });
  });

  describe('3. User & Profile Provisioning Idempotency & Role Protection', () => {
    it('membuat user baru dan profil jika akun belum ada di auth.users', async () => {
      const mockClient = createMockSupabaseClient({
        authUsers: [],
        profiles: [],
      });

      const spec = DEFAULT_LOCAL_TEST_USERS[0];
      const result = await provisionLocalUser(mockClient as any, {
        ...spec,
        password: 'ValidPassword123!',
      });

      expect(result.authAction).toBe('CREATED');
      expect(result.profileAction).toBe('CREATED');
      expect(result.role).toBe('SUPER_ADMIN');
      expect(mockClient.authAdminSpies.createUser).toHaveBeenCalledTimes(1);
      expect(mockClient.profileSpies.insert).toHaveBeenCalledTimes(1);
    });

    it('memperbarui password jika akun sudah ada, dan memverifikasi profil jika role sama', async () => {
      const existingUserId = 'user-uuid-1111';
      const mockClient = createMockSupabaseClient({
        authUsers: [
          {
            id: existingUserId,
            email: 'superadmin.local@simantik.test',
            user_metadata: { full_name: 'Super Administrator SIMANTIK' },
          },
        ],
        profiles: [
          {
            id: existingUserId,
            full_name: 'Super Administrator SIMANTIK',
            role: 'SUPER_ADMIN',
            is_active: true,
            email: 'superadmin.local@simantik.test',
          },
        ],
      });

      const spec = DEFAULT_LOCAL_TEST_USERS[0];
      const result = await provisionLocalUser(mockClient as any, {
        ...spec,
        password: 'NewValidPassword123!',
      });

      expect(result.authAction).toBe('UPDATED');
      expect(result.profileAction).toBe('VERIFIED');
      expect(mockClient.authAdminSpies.updateUserById).toHaveBeenCalledTimes(1);
      expect(mockClient.profileSpies.insert).not.toHaveBeenCalled();
    });

    it('menolak secara tegas (throw error) jika akun yang ada memiliki role berbeda (mencegah silent role mutation)', async () => {
      const existingUserId = 'user-uuid-2222';
      const mockClient = createMockSupabaseClient({
        authUsers: [
          {
            id: existingUserId,
            email: 'superadmin.local@simantik.test',
            user_metadata: { full_name: 'User Seseorang' },
          },
        ],
        profiles: [
          {
            id: existingUserId,
            full_name: 'User Seseorang',
            role: 'TECHNICIAN', // Eksisting role TECHNICIAN
            is_active: true,
            email: 'superadmin.local@simantik.test',
          },
        ],
      });

      const spec = DEFAULT_LOCAL_TEST_USERS[0]; // Mencoba menjadikannya SUPER_ADMIN

      await expect(
        provisionLocalUser(mockClient as any, {
          ...spec,
          password: 'PasswordBaru123!',
        })
      ).rejects.toThrow(/ROLE CONFLICT VIOLATION/);

      // Memastikan update role profil tidak dilakukan
      expect(mockClient.profileSpies.update).not.toHaveBeenCalled();
    });

    it('membuat profil jika user sudah ada di auth.users namun profil belum dibuat di DB', async () => {
      const existingUserId = 'user-uuid-3333';
      const mockClient = createMockSupabaseClient({
        authUsers: [
          {
            id: existingUserId,
            email: 'tenagaahli.local@simantik.test',
            user_metadata: { full_name: 'Tenaga Ahli SIMANTIK' },
          },
        ],
        profiles: [], // Profil belum ada
      });

      const spec = DEFAULT_LOCAL_TEST_USERS[1];
      const result = await provisionLocalUser(mockClient as any, {
        ...spec,
        password: 'ValidPassword123!',
      });

      expect(result.authAction).toBe('UPDATED');
      expect(result.profileAction).toBe('CREATED');
      expect(mockClient.profileSpies.insert).toHaveBeenCalledWith({
        id: existingUserId,
        full_name: 'Tenaga Ahli SIMANTIK',
        role: 'TECHNICIAN',
        is_active: true,
        email: 'tenagaahli.local@simantik.test',
      });
    });

    it('menolak jika password kurang dari 8 karakter', async () => {
      const mockClient = createMockSupabaseClient({
        authUsers: [],
        profiles: [],
      });

      await expect(
        provisionLocalUser(mockClient as any, {
          ...DEFAULT_LOCAL_TEST_USERS[0],
          password: 'short',
        })
      ).rejects.toThrow(/PASSWORD ERROR/);
    });
  });
});

/**
 * Helper Mock Supabase Client untuk testing tanpa menyentuh jaringan / database
 */
function createMockSupabaseClient(initialData: {
  authUsers: any[];
  profiles: any[];
}) {
  const users = [...initialData.authUsers];
  const profiles = [...initialData.profiles];

  const authAdminSpies = {
    listUsers: vi.fn(async () => ({ data: { users }, error: null })),
    createUser: vi.fn(async (params: any) => {
      const newUser = {
        id: `mock-generated-${Date.now()}`,
        email: params.email,
        user_metadata: params.user_metadata,
      };
      users.push(newUser);
      return { data: { user: newUser }, error: null };
    }),
    updateUserById: vi.fn(async (id: string, params: any) => {
      const u = users.find((item) => item.id === id);
      if (u) {
        if (params.user_metadata) u.user_metadata = params.user_metadata;
      }
      return { data: { user: u }, error: null };
    }),
  };

  const profileSpies = {
    select: vi.fn(),
    insert: vi.fn(async (row: any) => {
      profiles.push(row);
      return { data: row, error: null };
    }),
    update: vi.fn(async (row: any) => {
      return { data: row, error: null };
    }),
  };

  const fromSpy = vi.fn((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn((_cols: string) => ({
          eq: vi.fn((_col: string, val: string) => ({
            maybeSingle: vi.fn(async () => {
              const p = profiles.find((item) => item.id === val);
              return { data: p || null, error: null };
            }),
          })),
        })),
        insert: profileSpies.insert,
        update: vi.fn((patch: any) => ({
          eq: vi.fn(async (_col: string, _val: string) => {
            profileSpies.update(patch);
            return { data: patch, error: null };
          }),
        })),
      };
    }
    throw new Error(`Unexpected table ${table}`);
  });

  return {
    auth: {
      admin: authAdminSpies,
    },
    from: fromSpy,
    authAdminSpies,
    profileSpies,
  };
}
