import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MessagesService } from '../src/messages/messages.service.js';

describe('F5: Default Pesan Staf Internal & Validasi Visibilitas', () => {
  let messagesService: MessagesService;
  let mockSupabase: any;
  let mockNotif: any;
  let mockAssignments: any;
  let insertedData: any;

  beforeEach(() => {
    insertedData = null;
    mockSupabase = {
      getClient: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { current_status: 'PROCESSING' } }),
            }),
          }),
          insert: vi.fn().mockImplementation((payload) => {
            insertedData = payload;
            return Promise.resolve({ error: null });
          }),
        }),
      }),
    };
    mockNotif = { notify: vi.fn().mockResolvedValue({}) };
    mockAssignments = { checkTechnicianAuthorization: vi.fn().mockResolvedValue(true) };
    messagesService = new MessagesService(mockSupabase, mockNotif, mockAssignments);
  });

  const staffUser: any = {
    id: 'staff-uuid-1',
    role: 'SUPER_ADMIN',
    fullName: 'Budi Santoso',
    email: 'budi@bandungkab.go.id',
  };

  it('menetapkan default visibility INTERNAL bila field visibility tidak disertakan', async () => {
    const result = await messagesService.sendInternalMessage('app-1', staffUser, {
      message: 'Catatan teknis hasil telaah spesifikasi server dan firewall.',
    } as any);

    expect(result.visibility).toBe('INTERNAL');
    expect(insertedData.visibility).toBe('INTERNAL');
  });

  it('menetapkan default visibility INTERNAL bila field visibility bernilai undefined atau null', async () => {
    const result = await messagesService.sendInternalMessage('app-1', staffUser, {
      message: 'Catatan arsitektur basis data relasional SPBE.',
      visibility: undefined,
    } as any);

    expect(result.visibility).toBe('INTERNAL');
    expect(insertedData.visibility).toBe('INTERNAL');
  });

  it('menerima visibility PUBLIC jika ditentukan secara eksplisit oleh staf', async () => {
    const result = await messagesService.sendInternalMessage('app-1', staffUser, {
      message: 'Mohon pemohon instansi melengkapi surat persetujuan Kepala Dinas.',
      visibility: 'PUBLIC',
    });

    expect(result.visibility).toBe('PUBLIC');
    expect(insertedData.visibility).toBe('PUBLIC');
  });

  it('menolak dengan BadRequestException bila visibility bukan PUBLIC atau INTERNAL', async () => {
    await expect(
      messagesService.sendInternalMessage('app-1', staffUser, {
        message: 'Pesan dengan visibilitas salah.',
        visibility: 'CONFIDENTIAL' as any,
      }),
    ).rejects.toThrow(BadRequestException);

    try {
      await messagesService.sendInternalMessage('app-1', staffUser, {
        message: 'Pesan dengan visibilitas salah.',
        visibility: 'FOO_BAR' as any,
      });
    } catch (err: any) {
      expect(err.message).toBe('Visibilitas pesan tidak valid. Pilih PUBLIC atau INTERNAL.');
    }
  });
});
