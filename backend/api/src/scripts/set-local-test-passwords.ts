import * as readline from 'readline';
import { createClient } from '@supabase/supabase-js';
import {
  createLocalAdminClient,
  resolveExecutionConfig,
  validateSupabaseLocalUrl,
  validateTestEmail,
} from './local-test-users.js';

export interface TargetAccountConfig {
  email: string;
  expectedRole: 'SUPER_ADMIN' | 'TECHNICIAN';
  fullName: string;
  roleLabel: string;
  envPasswordKey: string;
}

export const TARGET_ACCOUNTS: TargetAccountConfig[] = [
  {
    email: 'superadmin.local@simantik.test',
    expectedRole: 'SUPER_ADMIN',
    fullName: 'Super Administrator SIMANTIK',
    roleLabel: 'Super Admin',
    envPasswordKey: 'LOCAL_SUPER_ADMIN_PASSWORD',
  },
  {
    email: 'tenagaahli.local@simantik.test',
    expectedRole: 'TECHNICIAN',
    fullName: 'Tenaga Ahli SIMANTIK',
    roleLabel: 'Tenaga Ahli',
    envPasswordKey: 'LOCAL_TECHNICIAN_PASSWORD',
  },
];

/**
 * Membaca input password secara tersembunyi (masking asterisk) dari terminal.
 */
export async function promptHiddenPassword(query: string): Promise<string> {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdout.write(query);
      let input = '';
      process.stdin.setRawMode(true);
      process.stdin.resume();

      const onData = (chunk: Buffer) => {
        const char = chunk.toString();
        if (char === '\n' || char === '\r' || char === '\u0004') {
          process.stdin.setRawMode(false);
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(input.trim());
        } else if (char === '\u0008' || char === '\x7f') {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else if (char === '\u0003') {
          process.exit(1);
        } else {
          input += char;
          process.stdout.write('*');
        }
      };

      process.stdin.on('data', onData);
    } else {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(query, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    }
  });
}

/**
 * Memperbarui password untuk akun pengujian lokal secara aman dan terisolasi.
 */
export async function updateLocalPasswords(options?: {
  onlyEmail?: string;
  superAdminPassword?: string;
  technicianPassword?: string;
}) {
  console.log('===========================================================');
  console.log(' SIMANTIK - Pembaruan Password Akun Pengujian Lokal');
  console.log(' Target: Supabase Local (127.0.0.1:54321)');
  console.log('===========================================================');

  const config = resolveExecutionConfig(process.env);
  validateSupabaseLocalUrl(config.supabaseUrl);

  const adminClient = createLocalAdminClient(config.supabaseUrl, config.serviceRoleKey);

  // Tentukan akun target yang akan diproses
  const filterEmail =
    options?.onlyEmail ||
    process.env.LOCAL_TARGET_EMAIL ||
    (process.env.LOCAL_TARGET_ACCOUNT === 'technician' ? 'tenagaahli.local@simantik.test' : undefined) ||
    (process.env.LOCAL_TARGET_ACCOUNT === 'superadmin' ? 'superadmin.local@simantik.test' : undefined);

  const targetsToProcess = filterEmail
    ? TARGET_ACCOUNTS.filter((t) => t.email.toLowerCase() === filterEmail.toLowerCase())
    : TARGET_ACCOUNTS;

  if (targetsToProcess.length === 0) {
    throw new Error(`TARGET ERROR: Akun target "${filterEmail}" tidak dikenali dalam daftar akun pengujian lokal.`);
  }

  console.log(`\n[FASE 1/3] Pre-flight Validation: Memeriksa integritas seluruh akun dan profil...`);

  // 1. Pre-flight Check: Periksa keberadaan semua akun di auth.users terlebih dahulu
  const { data: listData, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) {
    throw new Error(`AUTH ERROR: Gagal membaca daftar auth.users: ${listError.message}`);
  }

  const userMap = new Map<string, { id: string; email: string }>();
  for (const t of targetsToProcess) {
    validateTestEmail(t.email);
    const foundUser = listData.users.find((u) => u.email?.toLowerCase() === t.email.toLowerCase());
    if (!foundUser) {
      throw new Error(
        `NOT FOUND ERROR: Akun auth "${t.email}" belum terdaftar di Supabase lokal. ` +
        `Jalankan provisioning akun terlebih dahulu.`
      );
    }
    userMap.set(t.email, { id: foundUser.id, email: foundUser.email! });
  }

  // 2. Pre-flight Check: Periksa keberadaan dan kecocokan role profil di public.profiles
  for (const t of targetsToProcess) {
    const userInfo = userMap.get(t.email)!;
    const { data: profile, error: profError } = await adminClient
      .from('profiles')
      .select('id, full_name, role, is_active, email')
      .eq('id', userInfo.id)
      .maybeSingle();

    if (profError) {
      throw new Error(`DB ERROR: Gagal memeriksa profil "${t.email}": ${profError.message}`);
    }

    if (!profile) {
      throw new Error(
        `PROFILE NOT FOUND: Profil di tabel public.profiles untuk user "${t.email}" (ID: ${userInfo.id}) belum ada. ` +
        `Harap pastikan profil dibuat terlebih dahulu sebelum mengatur password.`
      );
    }

    if (profile.role !== t.expectedRole) {
      throw new Error(
        `ROLE MISMATCH ERROR: Role profil untuk "${t.email}" adalah "${profile.role}", ` +
        `namun yang diharapkan adalah "${t.expectedRole}". Pembaruan dibatalkan demi keamanan.`
      );
    }

    console.log(`  [OK] Akun "${t.email}" terverifikasi (ID: ${userInfo.id}, Role: ${profile.role}, Aktif: ${profile.is_active})`);
  }

  console.log(`[OK] Seluruh akun dan profil valid. Siap memperbarui password.`);

  // 3. Pengambilan password aman (hanya untuk akun target yang diproses)
  console.log(`\n[FASE 2/3] Pengambilan Password Baru...`);
  const passwordMap = new Map<string, string>();

  for (const t of targetsToProcess) {
    let pass: string | undefined;

    if (t.expectedRole === 'SUPER_ADMIN') {
      pass = options?.superAdminPassword || config.superAdminPassword;
    } else if (t.expectedRole === 'TECHNICIAN') {
      pass = options?.technicianPassword || config.technicianPassword;
    }

    if (!pass) {
      pass = await promptHiddenPassword(
        `Masukkan password baru untuk [${t.email}] (${t.roleLabel}, min 8 karakter): `
      );
    }

    if (!pass || pass.length < 8) {
      throw new Error(`PASSWORD ERROR: Password untuk [${t.email}] harus diisi dan minimal 8 karakter.`);
    }

    passwordMap.set(t.email, pass);
  }

  // 4. Eksekusi pembaruan password di Supabase Auth
  console.log(`\n[FASE 3/3] Memperbarui password dan memverifikasi login lokal...`);

  // Dapatkan publishable / anon key lokal untuk verifikasi login terpisah
  const publishableKey =
    process.env.LOCAL_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    config.serviceRoleKey;

  for (const t of targetsToProcess) {
    const userInfo = userMap.get(t.email)!;
    const newPassword = passwordMap.get(t.email)!;

    // Perbarui password via Admin API menggunakan adminClient
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userInfo.id, {
      password: newPassword,
      email_confirm: true,
    });

    if (updateError) {
      throw new Error(`UPDATE ERROR: Gagal memperbarui password untuk ${t.email}: ${updateError.message}`);
    }

    // PENTING: Verifikasi login dilakukan dengan client terpisah dan terisolasi
    // agar session token tidak menimpa header service-role pada adminClient!
    const verifyClient = createClient(config.supabaseUrl, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const { data: signInData, error: signInError } = await verifyClient.auth.signInWithPassword({
      email: t.email,
      password: newPassword,
    });

    if (signInError || !signInData.user) {
      throw new Error(
        `LOGIN VERIFICATION ERROR: Password untuk "${t.email}" telah dikirim ke Auth, ` +
        `tetapi pengujian login lokal gagal: ${signInError?.message}`
      );
    }

    console.log(`[SUKSES] Akun "${t.email}":`);
    console.log(`  - Role         : ${t.expectedRole} (${t.roleLabel})`);
    console.log(`  - Status Auth  : Password baru aktif`);
    console.log(`  - Verifikasi   : Sign-in lokal berhasil diverifikasi`);
  }

  console.log('\n===========================================================');
  console.log(' [SELESAI] Pembaruan password akun pengujian lokal berhasil.');
  console.log('===========================================================');
}

// CLI Execution entrypoint
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('set-local-test-passwords.ts') ||
    process.argv[1].endsWith('set-local-test-passwords.js'));

if (isDirectRun) {
  updateLocalPasswords().catch((err: any) => {
    console.error('\n[GAGAL MEMPERBARUI PASSWORD]');
    console.error(`Pesan: ${err.message}`);
    process.exit(1);
  });
}
