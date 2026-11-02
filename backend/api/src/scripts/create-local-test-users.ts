import {
  DEFAULT_LOCAL_TEST_USERS,
  createLocalAdminClient,
  provisionLocalUser,
  resolveExecutionConfig,
} from './local-test-users.js';

async function main() {
  console.log('===========================================================');
  console.log(' SIMANTIK - Local Test User Provisioning (Supabase Local)');
  console.log('===========================================================');

  try {
    const config = resolveExecutionConfig(process.env);

    console.log(`[OK] Target Supabase Local URL: ${config.supabaseUrl}`);
    console.log('[OK] Service Role Key: [TERKONFIGURASI & AMAN]');
    console.log('[OK] Host verified: Lokal (127.0.0.1 / localhost:54321)');

    const client = createLocalAdminClient(config.supabaseUrl, config.serviceRoleKey);

    for (const spec of DEFAULT_LOCAL_TEST_USERS) {
      console.log(`\n-----------------------------------------------------------`);
      console.log(`Memproses Akun: ${spec.fullName}`);
      console.log(`Email : ${spec.email}`);
      console.log(`Role  : ${spec.role} (${spec.role === 'TECHNICIAN' ? 'Tenaga Ahli' : 'Super Admin'})`);

      let password = '';
      if (spec.role === 'SUPER_ADMIN') {
        password = config.superAdminPassword || '';
      } else if (spec.role === 'TECHNICIAN') {
        password = config.technicianPassword || '';
      }

      if (!password) {
        throw new Error(
          `Password untuk role ${spec.role} (${spec.email}) belum ditentukan di environment variable! ` +
          `Pastikan LOCAL_SUPER_ADMIN_PASSWORD / LOCAL_TECHNICIAN_PASSWORD (atau LOCAL_TEST_PASSWORD) sudah di-set.`
        );
      }

      const result = await provisionLocalUser(client, {
        ...spec,
        password,
      });

      console.log(`[SUKSES] Akun siap digunakan untuk pengujian lokal:`);
      console.log(`  - User ID       : ${result.userId}`);
      console.log(`  - Auth State    : ${result.authAction}`);
      console.log(`  - Profile State : ${result.profileAction}`);
      console.log(`  - Email Status  : Terkonfirmasi (email_confirm: true)`);
    }

    console.log('\n===========================================================');
    console.log(' [SELESAI] Seluruh akun pengujian lokal telah siap.');
    console.log('===========================================================');
  } catch (error: any) {
    console.error('\n[GAGAL PROVISIONING]');
    console.error(`Pesan Error: ${error.message}`);
    process.exit(1);
  }
}

// Hanya dieksekusi langsung jika file dipanggil sebagai CLI entrypoint
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith('create-local-test-users.ts') ||
    process.argv[1].endsWith('create-local-test-users.js'));

if (isDirectExecution) {
  void main();
}
