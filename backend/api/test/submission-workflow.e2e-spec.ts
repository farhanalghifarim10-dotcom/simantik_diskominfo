import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { findExistingE2EApplication } from './e2e-idempotency.helper.js';
import { createDeterministicValidPdf } from './pdf-fixture.helper.js';

const BACKEND_API_BASE = 'http://127.0.0.1:3001/api/v1';

describe('SIMANTIK - Local E2E Submission & Web Admin Verification', () => {
  let supabaseStatus: any;
  let adminClient: any;
  let localApiUrl: string;

  it('1. Pre-flight Security Verification (Supabase Local & Backend Instance)', async () => {
    // 1. Ekstraksi status Supabase lokal secara in-memory
    const out = execSync('npx supabase status -o json', { cwd: 'd:/Projects/simantik' }).toString();
    const jsonStart = out.indexOf('{');
    supabaseStatus = JSON.parse(out.substring(jsonStart));

    localApiUrl = supabaseStatus.API_URL;

    // Fail-safe URL: Wajib 127.0.0.1:54321
    expect(localApiUrl).toBe('http://127.0.0.1:54321');
    expect(localApiUrl).not.toContain('supabase.co');

    // 2. Verifikasi Backend API pada http://127.0.0.1:3001/api/v1/health
    const healthRes = await fetch(`${BACKEND_API_BASE}/health`);
    expect(healthRes.status).toBe(200);
    const healthData = await healthRes.json();
    expect(healthData.success).toBe(true);
    expect(healthData.data?.service).toBe('simantik-api');

    adminClient = createClient(localApiUrl, supabaseStatus.SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  let createdTicketNumber: string;
  let createdTrackingCode: string;
  let createdApplicationId: string;

  it('2. Submit Satu Permohonan [UJI E2E LOKAL] melalui Alur Submission Sesungguhnya', async () => {
    // A. Ambil master data layanan dan OPD dari backend API lokal (sama seperti Web Layanan)
    const servicesRes = await fetch(`${BACKEND_API_BASE}/services`);
    expect(servicesRes.status).toBe(200);
    const servicesData = await servicesRes.json();
    const service = servicesData.data?.find((s: any) => s.code === 'SRV-DEV') || servicesData.data?.[0];
    expect(service).toBeDefined();

    const opdRes = await fetch(`${BACKEND_API_BASE}/opd`);
    expect(opdRes.status).toBe(200);
    const opdData = await opdRes.json();
    const opd = opdData.data?.[0];
    expect(opd).toBeDefined();

    // B. Ambil checklist persyaratan dokumen untuk layanan terpilih
    const reqsRes = await fetch(`${BACKEND_API_BASE}/services/${service.id}/requirements`);
    expect(reqsRes.status).toBe(200);
    const reqsData = await reqsRes.json();
    const reqs = reqsData.data || [];
    const docReqs = reqs.filter((r: any) => r.type === 'DOCUMENT' && r.is_required);
    expect(docReqs.length).toBeGreaterThan(0);

    // Cek apakah permohonan UJI E2E LOKAL sudah pernah dibuat sebelumnya (idempotency)
    const existingApp = await findExistingE2EApplication(adminClient);

    if (existingApp) {
      createdTicketNumber = existingApp.ticket_number;
      createdApplicationId = existingApp.id;
      console.log(`[E2E SUBMISSION SUDAH ADA - MEMPERTAHANKAN TIKET TUNGGAL]`);
      console.log(`  - Nomor Tiket : ${createdTicketNumber}`);
      console.log(`  - Status Awal : ${existingApp.current_status}`);
      return;
    }

    // C. Siapkan berkas PDF pengujian deterministik yang valid (ISO 32000-1) dan dapat dibuka di browser
    const validPdfBuffer = createDeterministicValidPdf('SURAT PERMOHONAN UJI E2E LOKAL SIMANTIK');
    const validPdfBase64 = validPdfBuffer.toString('base64');

    const documentsPayload = docReqs.map((r: any, idx: number) => ({
      requirement_id: r.id,
      original_filename: `dokumen_uji_e2e_fiktif_${idx + 1}.pdf`,
      mime_type: 'application/pdf',
      size_bytes: validPdfBuffer.length,
      base64_data: validPdfBase64,
    }));

    // D. Susun payload permohonan berpenanda [UJI E2E LOKAL]
    const submissionPayload = {
      service_id: service.id,
      opd_unit_id: opd.id,
      applicant_name: 'UJI E2E LOKAL - Budi Santoso',
      applicant_employee_id: '198501012010011001',
      applicant_position: 'Pranata Komputer Ahli Pertama',
      applicant_email: 'e2e.testing.pemohon@bandungkab.go.id',
      applicant_phone: '081234567890',
      title: '[UJI E2E LOKAL] Permohonan Sistem Informasi Pengujian Otomatis',
      background: '[UJI E2E LOKAL] Latar belakang pengujian otomatis alur permohonan pada instance lokal.',
      problem_statement: '[UJI E2E LOKAL] Rumusan masalah verifikasi penyimpanan tiket lokal.',
      objective: '[UJI E2E LOKAL] Memastikan tiket terdaftar di basis data dan terlihat di admin.',
      scope: '[UJI E2E LOKAL] Ruang lingkup pengujian alur pembuatan satu tiket.',
      expected_output: '[UJI E2E LOKAL] Tiket berstatus SUBMITTED.',
      terms_accepted: true,
      terms_version: 'v1.0-2026',
      idempotency_key: crypto.randomUUID(),
      documents: documentsPayload,
    };

    // E. Kirim permohonan via POST /applications pada backend API lokal
    const submitRes = await fetch(`${BACKEND_API_BASE}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submissionPayload),
    });

    const submitResult = await submitRes.json();
    expect(submitRes.status).toBe(201);
    expect(submitResult.success).toBe(true);
    expect(submitResult.data).toBeDefined();

    createdTicketNumber = submitResult.data.ticket_number;
    createdTrackingCode = submitResult.data.tracking_code;
    createdApplicationId = submitResult.data.id;

    expect(createdTicketNumber).toMatch(/^SIM-2026-\d{6}$/);
    expect(createdTrackingCode).toBeDefined();
    expect(submitResult.data.current_status).toBe('SUBMITTED');

    console.log(`[E2E SUBMISSION BERHASIL]`);
    console.log(`  - Nomor Tiket  : ${createdTicketNumber}`);
    console.log(`  - Tracking Code: ${createdTrackingCode}`);
    console.log(`  - Status Awal  : ${submitResult.data.current_status}`);
  });

  it('3. Verifikasi Tiket Dapat Dilihat di Web Admin (/admin/applications)', async () => {
    expect(createdTicketNumber).toBeDefined();

    // A. Buat sesi otentikasi Super Admin lokal via OTP Magiclink tanpa mengekspos/mengubah password
    const linkRes = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: 'superadmin.local@simantik.test',
    });
    const otp = linkRes.data?.properties?.email_otp;
    expect(otp).toBeDefined();

    const authClient = createClient(localApiUrl, supabaseStatus.PUBLISHABLE_KEY || supabaseStatus.ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const sessionRes = await authClient.auth.verifyOtp({
      email: 'superadmin.local@simantik.test',
      token: otp,
      type: 'magiclink',
    });

    const accessToken = sessionRes.data?.session?.access_token;
    expect(accessToken).toBeDefined();

    // B. Panggil endpoint Web Admin: GET /api/v1/admin/applications?search=${createdTicketNumber}
    const adminListRes = await fetch(
      `${BACKEND_API_BASE}/admin/applications?search=${encodeURIComponent(createdTicketNumber)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    expect(adminListRes.status).toBe(200);
    const adminListData = await adminListRes.json();
    expect(adminListData.success).toBe(true);

    const items = adminListData.data?.items || [];
    const matched = items.find((item: any) => item.ticket_number === createdTicketNumber);

    expect(matched).toBeDefined();
    expect(matched.ticket_number).toBe(createdTicketNumber);
    expect(matched.title).toBe('[UJI E2E LOKAL] Permohonan Sistem Informasi Pengujian Otomatis');
    expect(matched.current_status).toBe('SUBMITTED');

    // C. Panggil detail permohonan: GET /api/v1/admin/applications/${createdApplicationId}
    const detailRes = await fetch(`${BACKEND_API_BASE}/admin/applications/${createdApplicationId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    expect(detailRes.status).toBe(200);
    const detailData = await detailRes.json();
    expect(detailData.success).toBe(true);
    expect(detailData.data?.ticket_number).toBe(createdTicketNumber);
    expect(detailData.data?.documents?.length).toBeGreaterThan(0);

    console.log(`[VERIFIKASI WEB ADMIN BERHASIL]`);
    console.log(`  - Tiket Terverifikasi di Web Admin: ${matched.ticket_number}`);
    console.log(`  - Status di Admin Dashboard       : ${matched.current_status}`);
    console.log(`  - Dokumen Terlampir               : ${detailData.data?.documents?.length} berkas`);
  });

  it('4. Bukti Data Hanya Terbuat di Supabase Lokal', async () => {
    // Verifikasi langsung pada tabel Supabase lokal via service role
    const { data: dbApps, error: dbError } = await adminClient
      .from('applications')
      .select('id, ticket_number, title, current_status')
      .eq('ticket_number', createdTicketNumber);

    expect(dbError).toBeNull();
    expect(dbApps?.length).toBe(1);
    expect(dbApps?.[0].ticket_number).toBe(createdTicketNumber);

    // Ambil metadata dokumen yang tersimpan di basis data untuk tiket ini
    const { data: dbDocs, error: dbDocsError } = await adminClient
      .from('application_documents')
      .select('id, storage_path, original_filename')
      .eq('application_id', createdApplicationId);

    expect(dbDocsError).toBeNull();
    expect(dbDocs?.length).toBeGreaterThan(0);

    // Verifikasi berkas tersimpan di Storage lokal bucket 'simantik-documents'
    const { data: storageFiles, error: storageError } = await adminClient
      .storage
      .from('simantik-documents')
      .list(`applications/${createdTicketNumber}`);

    expect(storageError).toBeNull();
    expect(storageFiles?.length).toBeGreaterThan(0);

    // Verifikasi setiap dokumen di database memiliki file fisik yang sesuai di storage
    const storageFileNames = new Set((storageFiles || []).map((f: any) => f.name));
    for (const doc of dbDocs || []) {
      const fileNameFromPath = doc.storage_path.split('/').pop();
      expect(storageFileNames.has(fileNameFromPath)).toBe(true);
    }

    console.log(`[BUKTI BASIS DATA & STORAGE LOKAL]`);
    console.log(`  - Target Instance: ${localApiUrl} (Supabase Local Docker)`);
    console.log(`  - Baris DB Lokal : ${dbApps?.length} data ditemukan`);
    console.log(`  - Dokumen DB     : ${dbDocs?.length} dokumen terdaftar`);
    console.log(`  - File Storage   : ${storageFiles?.length} berkas tersimpan di applications/${createdTicketNumber}`);
  });
});
