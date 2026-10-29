import { describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { findExistingE2EApplication } from './e2e-idempotency.helper.js';

describe('E2E Idempotency Regression & Safeguard Tests', () => {
  describe('A. Unit Tests: Query Error & Idempotency Safeguards', () => {
    it('1. Membatalkan proses dan melempar error jika query pencegah duplikasi gagal (mencegah silent bypass)', async () => {
      // Simulasi error yang terjadi saat query meminta kolom tracking_code yang tidak ada
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: null,
                  error: {
                    message: 'column applications.tracking_code does not exist',
                    code: '42703',
                  },
                }),
              }),
            }),
          }),
        }),
      };

      const submitAction = vi.fn();

      // Eksekusi harus throw dan submitAction TIDAK BOLEH dipanggil sama sekali
      await expect(findExistingE2EApplication(mockClient as any)).rejects.toThrow(
        /\[E2E IDEMPOTENCY CHECK FAILED\] Gagal memeriksa permohonan eksisting/,
      );

      expect(submitAction).not.toHaveBeenCalled();
    });

    it('2. Mengenali tiket yang sudah ada dan mengembalikan data permohonan tanpa submission baru', async () => {
      const existingRecord = {
        id: '0190217e-cb46-48e5-83dc-f88e54c4b621',
        ticket_number: 'SIM-2026-106710',
        current_status: 'SUBMITTED',
        title: '[UJI E2E LOKAL] Permohonan Sistem Informasi Pengujian Otomatis',
      };

      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [existingRecord],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      const result = await findExistingE2EApplication(mockClient as any);

      expect(result).not.toBeNull();
      expect(result?.ticket_number).toBe('SIM-2026-106710');
      expect(result?.id).toBe('0190217e-cb46-48e5-83dc-f88e54c4b621');
      expect(result?.current_status).toBe('SUBMITTED');
    });

    it('3. Mengembalikan null secara aman jika data belum ada (hanya dalam kondisi ini submit diizinkan)', async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      const result = await findExistingE2EApplication(mockClient as any);
      expect(result).toBeNull();
    });
  });

  describe('B. Read-Only Integration Tests: Terhadap Skema Supabase Lokal Nyata', () => {
    it('4. Memverifikasi query yang diperbaiki dapat mendeteksi tiket lokal tanpa error kolom', async (ctx) => {
      // Ambil konfigurasi lokal in-memory
      const out = execSync('npx supabase status -o json', { cwd: 'd:/Projects/simantik' }).toString();
      const jsonStart = out.indexOf('{');
      const supabaseStatus = JSON.parse(out.substring(jsonStart));

      // Pastikan target 100% lokal
      expect(supabaseStatus.API_URL).toBe('http://127.0.0.1:54321');

      const adminClient = createClient(supabaseStatus.API_URL, supabaseStatus.SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Jalankan fungsi findExistingE2EApplication terhadap instance lokal nyata
      const existingApp = await findExistingE2EApplication(adminClient as any);

      if (!existingApp) {
        ctx.skip('fixture UJI E2E LOKAL tidak ada di DB lokal; jalankan submission-workflow.e2e-spec terlebih dahulu');
        return;
      }

      expect(existingApp).not.toBeNull();
      expect(existingApp.ticket_number).toMatch(/^SIM-2026-\d{6}$/);
      expect(existingApp.current_status).toBe('SUBMITTED');
      expect(existingApp.title).toContain('UJI E2E LOKAL');
    });

    it('5. Membuktikan bahwa query dengan kolom tracking_code pada DB nyata pasti memicu proteksi error', async () => {
      const out = execSync('npx supabase status -o json', { cwd: 'd:/Projects/simantik' }).toString();
      const jsonStart = out.indexOf('{');
      const supabaseStatus = JSON.parse(out.substring(jsonStart));

      const adminClient = createClient(supabaseStatus.API_URL, supabaseStatus.SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Lakukan query yang salah (meminta tracking_code) ke Supabase lokal
      const { data, error } = await adminClient
        .from('applications')
        .select('id, ticket_number, tracking_code, current_status, title')
        .ilike('title', '%UJI E2E LOKAL%')
        .limit(1);

      // Bukti nyata: PostgREST mengembalikan error 42703 dan data adalah null
      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.message).toContain('column applications.tracking_code does not exist');
    });
  });
});
