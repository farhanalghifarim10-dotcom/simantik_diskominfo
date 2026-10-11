import { describe, it, expect } from 'vitest';
import {
  calculateServiceTransition,
  filterValidUploadedDocuments,
  getValidDocumentRequirements,
  type UploadedFileState,
} from './submissionWizard';
import type { Service } from '../hooks/useServices';

describe('Submission Wizard State & Category Transition Regression Tests', () => {
  const now = '2026-01-01T00:00:00.000Z';

  const servicePembangunan: Service = {
    id: '11111111-1111-1111-1111-111111111111',
    code: 'SRV-DEV',
    slug: 'pembangunan-aplikasi',
    name: 'Pembangunan Aplikasi Baru',
    type: 'DEVELOPMENT',
    description: 'Layanan pembangunan aplikasi baru dari awal.',
    is_active: true,
    sort_order: 1,
    created_at: now,
    updated_at: now,
    requirements: [
      {
        id: 'a1111111-1111-1111-1111-111111111111',
        service_id: '11111111-1111-1111-1111-111111111111',
        name: 'Surat Permohonan Resmi OPD',
        description: 'Surat dinas resmi (PDF)',
        type: 'DOCUMENT',
        is_required: true,
        sort_order: 1,
        allowed_file_types: 'application/pdf',
        max_file_size_mb: 5,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a2222222-2222-2222-2222-222222222222',
        service_id: '11111111-1111-1111-1111-111111111111',
        name: 'Kerangka Acuan Kerja (KAK)',
        description: 'KAK sistem baru (PDF)',
        type: 'DOCUMENT',
        is_required: true,
        sort_order: 2,
        allowed_file_types: 'application/pdf',
        max_file_size_mb: 10,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a3333333-3333-3333-3333-333333333333',
        service_id: '11111111-1111-1111-1111-111111111111',
        name: 'Narahubung PIC',
        description: 'Data kontak',
        type: 'DATA',
        is_required: true,
        sort_order: 3,
        created_at: now,
        updated_at: now,
      },
    ],
  };

  const servicePengembangan: Service = {
    id: '22222222-2222-2222-2222-222222222222',
    code: 'SRV-ENH',
    slug: 'pengembangan-aplikasi',
    name: 'Pengembangan Aplikasi Eksisting',
    type: 'ENHANCEMENT',
    description: 'Layanan pengembangan sistem informasi berjalan.',
    is_active: true,
    sort_order: 2,
    created_at: now,
    updated_at: now,
    requirements: [
      {
        id: 'b1111111-1111-1111-1111-111111111111',
        service_id: '22222222-2222-2222-2222-222222222222',
        name: 'Surat Permohonan Perubahan',
        description: 'Surat dinas usulan perubahan',
        type: 'DOCUMENT',
        is_required: true,
        sort_order: 1,
        allowed_file_types: 'application/pdf',
        max_file_size_mb: 5,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'b2222222-2222-2222-2222-222222222222',
        service_id: '22222222-2222-2222-2222-222222222222',
        name: 'Dokumen Kebutuhan Fitur (Change Request)',
        description: 'CR penambahan fitur',
        type: 'DOCUMENT',
        is_required: true,
        sort_order: 2,
        allowed_file_types: 'application/pdf',
        max_file_size_mb: 10,
        created_at: now,
        updated_at: now,
      },
    ],
  };

  describe('1. Document Requirement Extraction', () => {
    it('should extract only requirements of type DOCUMENT', () => {
      const docs = getValidDocumentRequirements(servicePembangunan);
      expect(docs).toHaveLength(2);
      expect(docs.every((d) => d.type === 'DOCUMENT')).toBe(true);
      expect(docs.some((d) => d.name === 'Narahubung PIC')).toBe(false);
    });
  });

  describe('2. Scenario: Switching from Pembangunan to Pengembangan after uploading 2 documents', () => {
    const uploadedPembangunanDocs: Record<string, UploadedFileState> = {
      'a1111111-1111-1111-1111-111111111111': {
        requirement_id: 'a1111111-1111-1111-1111-111111111111',
        original_filename: 'Surat_Permohonan_Kadis.pdf',
        mime_type: 'application/pdf',
        size_bytes: 102400,
        base64_data: 'JVBERi0xLjQK...',
      },
      'a2222222-2222-2222-2222-222222222222': {
        requirement_id: 'a2222222-2222-2222-2222-222222222222',
        original_filename: 'KAK_Presensi.pdf',
        mime_type: 'application/pdf',
        size_bytes: 204800,
        base64_data: 'JVBERi0xLjQK...',
      },
    };

    it('should clear old uploaded documents and notify user when category changes', () => {
      const transition = calculateServiceTransition(
        servicePengembangan,
        servicePembangunan.id,
        uploadedPembangunanDocs,
        '',
      );

      expect(transition.docsChanged).toBe(true);
      expect(transition.newDocs).toEqual({});
      expect(transition.resetTerms).toBe(true);
      expect(transition.noticeMessage).toContain('Kategori diubah ke "Pengembangan Aplikasi Eksisting"');
      expect(transition.noticeMessage).toContain('Berkas persyaratan sebelumnya telah dibersihkan');
    });

    it('should not mutate state if selecting the same service again', () => {
      const transition = calculateServiceTransition(
        servicePembangunan,
        servicePembangunan.id,
        uploadedPembangunanDocs,
        '',
      );

      expect(transition.docsChanged).toBe(false);
      expect(transition.newDocs).toBe(uploadedPembangunanDocs);
      expect(transition.resetTerms).toBe(false);
      expect(transition.noticeMessage).toBeUndefined();
    });

    it('should prevent zombie/orphan documents from appearing in review or submission payload', () => {
      // Misalkan state mengandung dokumen lama dan dokumen baru (seperti bug awal 4 entri)
      const dirtyStateWithZombies: Record<string, UploadedFileState> = {
        ...uploadedPembangunanDocs,
        'b1111111-1111-1111-1111-111111111111': {
          requirement_id: 'b1111111-1111-1111-1111-111111111111',
          original_filename: 'Surat_Perubahan_Bapenda.pdf',
          mime_type: 'application/pdf',
          size_bytes: 102400,
        },
        'b2222222-2222-2222-2222-222222222222': {
          requirement_id: 'b2222222-2222-2222-2222-222222222222',
          original_filename: 'Change_Request_Simpbb.pdf',
          mime_type: 'application/pdf',
          size_bytes: 153600,
        },
      };

      // Saat ditinjau untuk Pengembangan Aplikasi Eksisting:
      const filteredForPengembangan = filterValidUploadedDocuments(
        dirtyStateWithZombies,
        servicePengembangan,
      );

      // Harus tepat 2 dokumen yang sah untuk Pengembangan, bukan 4!
      expect(filteredForPengembangan).toHaveLength(2);
      expect(filteredForPengembangan.map((d) => d.requirement_id)).toEqual([
        'b1111111-1111-1111-1111-111111111111',
        'b2222222-2222-2222-2222-222222222222',
      ]);
      expect(
        filteredForPengembangan.some((d) => d.original_filename === 'KAK_Presensi.pdf'),
      ).toBe(false);
    });

    it('should not allow duplicate entries for the same requirement ID', () => {
      const duplicateDocs: Record<string, UploadedFileState> = {
        'b1111111-1111-1111-1111-111111111111': {
          requirement_id: 'b1111111-1111-1111-1111-111111111111',
          original_filename: 'Surat_Perubahan_Final.pdf',
          mime_type: 'application/pdf',
          size_bytes: 102400,
        },
      };

      const result = filterValidUploadedDocuments(duplicateDocs, servicePengembangan);
      expect(result).toHaveLength(1);
      expect(result[0].original_filename).toBe('Surat_Perubahan_Final.pdf');
    });
  });

  describe('3. Scenario: Resetting service-specific fields when changing category', () => {
    it('should clear existingApplicationName when moving from ENHANCEMENT to DEVELOPMENT', () => {
      const transition = calculateServiceTransition(
        servicePembangunan, // Layanan baru: DEVELOPMENT
        servicePengembangan.id, // Layanan sebelumnya: ENHANCEMENT
        {},
        'SIM-PBB (https://simpbb.bandungkab.go.id)',
      );

      // Bidang khusus eksisting harus direset
      expect(transition.newExistingApplicationName).toBe('');
    });

    it('should preserve existingApplicationName when switching within ENHANCEMENT', () => {
      const anotherEnhancement: Service = {
        ...servicePengembangan,
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Pengembangan Lanjutan',
      };

      const transition = calculateServiceTransition(
        anotherEnhancement,
        servicePengembangan.id,
        {},
        'SIM-PBB',
      );

      expect(transition.newExistingApplicationName).toBe('SIM-PBB');
    });
  });
});
