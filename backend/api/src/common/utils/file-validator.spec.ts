import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import {
  extractSafeExtension,
  generateSecureStorageKey,
  parseAndValidateBase64,
  sanitizeFilename,
  validateUploadedFile,
} from './file-validator.js';

describe('File Validator Utility (UAT-04)', () => {
  // Safe dummy buffers
  const dummyPdfBuffer = Buffer.from('%PDF-1.4 safe dummy content');
  const dummyPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  const dummyJpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  const dummyDocxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
  const dummyXlsxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
  const dummyDocOleBuffer = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  const dummyXlsOleBuffer = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  const dummyTxtBuffer = Buffer.from('Just plain text file content without magic bytes');
  const dummyExeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // MZ executable
  const dummyBatBuffer = Buffer.from('@echo off\r\ndir\r\n');

  describe('A. Valid PDF is accepted', () => {
    it('should accept valid PDF with correct mime and buffer', () => {
      expect(() =>
        validateUploadedFile({
          original_filename: 'surat_permohonan.pdf',
          mime_type: 'application/pdf',
          size_bytes: 1024,
          buffer: dummyPdfBuffer,
        }),
      ).not.toThrow();
    });
  });

  describe('B. Valid DOC/DOCX/XLS/XLSX/JPEG/PNG files are accepted where allowed', () => {
    it('should accept valid DOCX file', () => {
      expect(() =>
        validateUploadedFile({
          original_filename: 'kak_document.docx',
          mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size_bytes: 2048,
          buffer: dummyDocxBuffer,
        }),
      ).not.toThrow();
    });

    it('should accept valid XLSX file', () => {
      expect(() =>
        validateUploadedFile({
          original_filename: 'data_rekap.xlsx',
          mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size_bytes: 3072,
          buffer: dummyXlsxBuffer,
        }),
      ).not.toThrow();
    });

    it('should accept valid PNG image', () => {
      expect(() =>
        validateUploadedFile({
          original_filename: 'arsitektur_sistem.png',
          mime_type: 'image/png',
          size_bytes: 4096,
          buffer: dummyPngBuffer,
        }),
      ).not.toThrow();
    });

    it('should accept valid JPEG image', () => {
      expect(() =>
        validateUploadedFile({
          original_filename: 'alur_pelayanan.jpg',
          mime_type: 'image/jpeg',
          size_bytes: 4096,
          buffer: dummyJpgBuffer,
        }),
      ).not.toThrow();
    });

    it('should accept valid legacy DOC file', () => {
      expect(() =>
        validateUploadedFile({
          original_filename: 'arsip_lama.doc',
          mime_type: 'application/msword',
          size_bytes: 2048,
          buffer: dummyDocOleBuffer,
        }),
      ).not.toThrow();
    });

    it('should accept valid legacy XLS file', () => {
      expect(() =>
        validateUploadedFile({
          original_filename: 'tabel_lama.xls',
          mime_type: 'application/vnd.ms-excel',
          size_bytes: 2048,
          buffer: dummyXlsOleBuffer,
        }),
      ).not.toThrow();
    });
  });

  describe('C. TXT is rejected', () => {
    it('should reject .txt file with text/plain mime type with DOCUMENT_INVALID_TYPE', () => {
      try {
        validateUploadedFile({
          original_filename: 'catatan_rahasia.txt',
          mime_type: 'text/plain',
          size_bytes: 512,
          buffer: dummyTxtBuffer,
        });
        expect.unreachable('Should have thrown BadRequestException');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = (err as BadRequestException).getResponse() as any;
        expect(resp.code).toBe('DOCUMENT_INVALID_TYPE');
        expect(resp.message).toContain('.txt');
      }
    });

    it('should reject .txt file even if client falsely declares application/pdf', () => {
      try {
        validateUploadedFile({
          original_filename: 'dokumen_palsu.txt',
          mime_type: 'application/pdf',
          size_bytes: 512,
          buffer: dummyTxtBuffer,
        });
        expect.unreachable('Should have thrown BadRequestException');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = (err as BadRequestException).getResponse() as any;
        expect(resp.code).toBe('DOCUMENT_INVALID_TYPE');
      }
    });
  });

  describe('D. EXE and BAT are rejected', () => {
    it('should reject .exe file with application/x-msdownload', () => {
      try {
        validateUploadedFile({
          original_filename: 'installer.exe',
          mime_type: 'application/x-msdownload',
          size_bytes: 10240,
          buffer: dummyExeBuffer,
        });
        expect.unreachable('Should have thrown BadRequestException');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = (err as BadRequestException).getResponse() as any;
        expect(resp.code).toBe('DOCUMENT_INVALID_TYPE');
      }
    });

    it('should reject .bat script file', () => {
      try {
        validateUploadedFile({
          original_filename: 'run_script.bat',
          mime_type: 'text/plain',
          size_bytes: 256,
          buffer: dummyBatBuffer,
        });
        expect.unreachable('Should have thrown BadRequestException');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = (err as BadRequestException).getResponse() as any;
        expect(resp.code).toBe('DOCUMENT_INVALID_TYPE');
      }
    });
  });

  describe('E. Misleading extension or MIME mismatch is rejected', () => {
    it('should reject file named .pdf containing plain text (magic byte mismatch)', () => {
      try {
        validateUploadedFile({
          original_filename: 'spoofed_document.pdf',
          mime_type: 'application/pdf',
          size_bytes: 512,
          buffer: dummyTxtBuffer, // Text content without %PDF-
        });
        expect.unreachable('Should have thrown BadRequestException');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = (err as BadRequestException).getResponse() as any;
        expect(resp.code).toBe('DOCUMENT_INVALID_TYPE');
        expect(resp.message).toContain('tanda tangan PDF');
      }
    });

    it('should reject file named .png containing MZ executable header', () => {
      try {
        validateUploadedFile({
          original_filename: 'hidden_trojan.png',
          mime_type: 'image/png',
          size_bytes: 4096,
          buffer: dummyExeBuffer, // MZ header disguised as PNG
        });
        expect.unreachable('Should have thrown BadRequestException');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = (err as BadRequestException).getResponse() as any;
        expect(resp.code).toBe('DOCUMENT_INVALID_TYPE');
        expect(resp.message).toContain('executable');
      }
    });

    it('should reject file named .pdf declared as image/png', () => {
      try {
        validateUploadedFile({
          original_filename: 'surat.pdf',
          mime_type: 'image/png',
          size_bytes: 1024,
          buffer: dummyPdfBuffer,
        });
        expect.unreachable('Should have thrown BadRequestException');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = (err as BadRequestException).getResponse() as any;
        expect(resp.code).toBe('DOCUMENT_INVALID_TYPE');
      }
    });
  });

  describe('F. Requirement-specific narrowing is enforced', () => {
    it('should reject PNG image for a requirement that strictly requires PDF', () => {
      const pdfOnlyRequirement = {
        name: 'Surat Permohonan Resmi',
        allowed_file_types: 'application/pdf',
      };

      try {
        validateUploadedFile(
          {
            original_filename: 'foto_surat.png',
            mime_type: 'image/png',
            size_bytes: 2048,
            buffer: dummyPngBuffer,
          },
          pdfOnlyRequirement,
        );
        expect.unreachable('Should have thrown BadRequestException');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = (err as BadRequestException).getResponse() as any;
        expect(resp.code).toBe('DOCUMENT_INVALID_TYPE');
        expect(resp.message).toContain('hanya menerima format: application/pdf');
      }
    });

    it('should accept valid PDF for a requirement that strictly requires PDF', () => {
      const pdfOnlyRequirement = {
        name: 'Surat Permohonan Resmi',
        allowed_file_types: 'application/pdf',
      };

      expect(() =>
        validateUploadedFile(
          {
            original_filename: 'surat_resmi.pdf',
            mime_type: 'application/pdf',
            size_bytes: 2048,
            buffer: dummyPdfBuffer,
          },
          pdfOnlyRequirement,
        ),
      ).not.toThrow();
    });
  });

  describe('G. Binary buffer enforcement (Metadata-only document rejection)', () => {
    it('should reject document with missing buffer (undefined)', () => {
      try {
        validateUploadedFile({
          original_filename: 'dokumen.pdf',
          mime_type: 'application/pdf',
          size_bytes: 1024,
          buffer: undefined,
        });
        expect.unreachable('Should have thrown BadRequestException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = err.getResponse();
        expect(resp.code).toBe('DOCUMENT_INVALID_TYPE');
        expect(resp.message).toContain('data konten biner');
      }
    });

    it('should reject document with empty zero-length buffer', () => {
      try {
        validateUploadedFile({
          original_filename: 'dokumen.pdf',
          mime_type: 'application/pdf',
          size_bytes: 0,
          buffer: Buffer.alloc(0),
        });
        expect.unreachable('Should have thrown BadRequestException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = err.getResponse();
        expect(resp.code).toBe('DOCUMENT_INVALID_TYPE');
        expect(resp.message).toContain('data konten biner');
      }
    });
  });

  describe('H. Filename sanitation & validation', () => {
    it('should reject filename containing null bytes', () => {
      try {
        validateUploadedFile({
          original_filename: 'surat\x00_resmi.pdf',
          mime_type: 'application/pdf',
          size_bytes: 1024,
          buffer: dummyPdfBuffer,
        });
        expect.unreachable('Should have rejected null bytes');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = err.getResponse();
        expect(resp.code).toBe('DOCUMENT_INVALID_TYPE');
        expect(resp.message).toContain('karakter kontrol atau null byte');
      }
    });

    it('should reject filename containing control characters like newline or carriage return', () => {
      try {
        validateUploadedFile({
          original_filename: 'surat\r\n_resmi.pdf',
          mime_type: 'application/pdf',
          size_bytes: 1024,
          buffer: dummyPdfBuffer,
        });
        expect.unreachable('Should have rejected control characters');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = err.getResponse();
        expect(resp.code).toBe('DOCUMENT_INVALID_TYPE');
        expect(resp.message).toContain('karakter kontrol atau null byte');
      }
    });

    it('should reject filename exceeding 255 characters', () => {
      const veryLongName = 'a'.repeat(252) + '.pdf'; // 256 chars
      try {
        validateUploadedFile({
          original_filename: veryLongName,
          mime_type: 'application/pdf',
          size_bytes: 1024,
          buffer: dummyPdfBuffer,
        });
        expect.unreachable('Should have rejected overly long filename');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = err.getResponse();
        expect(resp.code).toBe('DOCUMENT_INVALID_TYPE');
        expect(resp.message).toContain('terlalu panjang');
      }
    });

    it('should accept valid natural Indonesian filenames with spaces, parentheses, accents, and dashes', () => {
      expect(() =>
        validateUploadedFile({
          original_filename: 'Surat Permohonan (Dinas Pendidikan & Kebudayaan) - Kab. Bandung 2026.pdf',
          mime_type: 'application/pdf',
          size_bytes: 2048,
          buffer: dummyPdfBuffer,
        }),
      ).not.toThrow();
    });
  });

  describe('I. Strict Base64 Parsing & Validation (parseAndValidateBase64)', () => {
    it('should decode valid standard raw Base64 string', () => {
      const base64Str = dummyPdfBuffer.toString('base64');
      const decoded = parseAndValidateBase64(base64Str, 'test.pdf');
      expect(decoded).toBeInstanceOf(Buffer);
      expect(decoded.equals(dummyPdfBuffer)).toBe(true);
    });

    it('should decode valid Data URL formatted Base64 string with explicit prefix', () => {
      const dataUrl = `data:application/pdf;base64,${dummyPdfBuffer.toString('base64')}`;
      const decoded = parseAndValidateBase64(dataUrl, 'test.pdf');
      expect(decoded).toBeInstanceOf(Buffer);
      expect(decoded.equals(dummyPdfBuffer)).toBe(true);
    });

    it('should reject missing, null, undefined, or empty base64 string', () => {
      expect(() => parseAndValidateBase64(null, 'test.pdf')).toThrow(BadRequestException);
      expect(() => parseAndValidateBase64(undefined, 'test.pdf')).toThrow(BadRequestException);
      expect(() => parseAndValidateBase64('', 'test.pdf')).toThrow(BadRequestException);
      expect(() => parseAndValidateBase64('    ', 'test.pdf')).toThrow(BadRequestException);
      expect(() => parseAndValidateBase64(12345, 'test.pdf')).toThrow(BadRequestException);
    });

    it('should reject malformed Data URL prefix', () => {
      expect(() => parseAndValidateBase64('data:invalid-prefix', 'test.pdf')).toThrow(BadRequestException);
      expect(() => parseAndValidateBase64('data:application/pdf;notbase64,AAAA', 'test.pdf')).toThrow(BadRequestException);
      expect(() => parseAndValidateBase64('data:application/pdf;base64,', 'test.pdf')).toThrow(BadRequestException);
    });

    it('should reject Base64 with foreign / non-base64 characters', () => {
      const invalidChars = 'JVBERi0xLjQK@#$%^&*()';
      expect(() => parseAndValidateBase64(invalidChars, 'test.pdf')).toThrow(BadRequestException);

      const invalidWithDash = 'JVBERi-xLjQK';
      expect(() => parseAndValidateBase64(invalidWithDash, 'test.pdf')).toThrow(BadRequestException);

      const invalidWithSpaceInside = 'JVBE Ri0x LjQK';
      expect(() => parseAndValidateBase64(invalidWithSpaceInside, 'test.pdf')).toThrow(BadRequestException);
    });

    it('should reject Base64 with invalid padding or truncated length (not divisible by 4)', () => {
      // Length 9 (not divisible by 4)
      expect(() => parseAndValidateBase64('JVBERi0xL', 'test.pdf')).toThrow(BadRequestException);
      // Length 11
      expect(() => parseAndValidateBase64('JVBERi0xLjQ', 'test.pdf')).toThrow(BadRequestException);
      // Invalid padding characters
      expect(() => parseAndValidateBase64('JVBERi0x===', 'test.pdf')).toThrow(BadRequestException);
      expect(() => parseAndValidateBase64('JVBERi0x====', 'test.pdf')).toThrow(BadRequestException);
      expect(() => parseAndValidateBase64('JVBE=i0x', 'test.pdf')).toThrow(BadRequestException);
    });

    it('should reject Base64 with non-canonical padding bits or trailing garbage', () => {
      // In Base64, 'AB==' has index 1 for 'B', where non-zero bits are placed in unused padding bits
      // Buffer.from normally ignores this and decodes to 0x00, re-encoding to 'AA=='
      expect(() => parseAndValidateBase64('AB==', 'test.pdf')).toThrow(BadRequestException);

      // Trailing characters after valid 4-byte block that would normally be discarded by loose parsers
      const validBase64 = dummyPdfBuffer.toString('base64');
      expect(() => parseAndValidateBase64(validBase64 + 'AAAA====', 'test.pdf')).toThrow(BadRequestException);
    });
  });

  describe('J. Secure Storage Key & Extension Utilities', () => {
    it('should extract safe lowercase extension from valid filename', () => {
      expect(extractSafeExtension('SURAT_PERMOHONAN.PDF')).toBe('pdf');
      expect(extractSafeExtension('laporan.final.docx')).toBe('docx');
      expect(extractSafeExtension('tabel.XLSX')).toBe('xlsx');
      expect(extractSafeExtension('gambar.PNG')).toBe('png');
    });

    it('should reject unsupported or missing extension', () => {
      expect(() => extractSafeExtension('script.exe')).toThrow(BadRequestException);
      expect(() => extractSafeExtension('file_tanpa_ekstensi')).toThrow(BadRequestException);
      expect(() => extractSafeExtension('berkas.')).toThrow(BadRequestException);
    });

    it('should generate secure storage key with server random UUID and safe extension without original filename', () => {
      const prefix = 'applications/SIM-2026-000101';
      const originalFilename = 'Surat Permohonan (Dinas Pendidikan) — Final 2026.PDF';

      const key = generateSecureStorageKey(prefix, originalFilename);

      // Verify prefix is preserved
      expect(key.startsWith('applications/SIM-2026-000101/')).toBe(true);

      // Verify original filename is completely absent from storage key
      expect(key).not.toContain('Surat');
      expect(key).not.toContain('Dinas');
      expect(key).not.toContain('Pendidikan');
      expect(key).not.toContain('Final');

      // Verify key basename matches UUID v4 pattern and safe extension
      const filenamePart = key.replace('applications/SIM-2026-000101/', '');
      expect(filenamePart).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/);
    });

    it('should safely handle extreme long or Unicode filenames in generateSecureStorageKey', () => {
      const prefix = 'applications/SIM-2026-999999';
      const extremeUnicodeName = 'Dokumen_Pengajuan_SPBE_Kabupaten_Bandung_Sangat_Panjang_Sekali_Untuk_Uji_Batas_Maksimal_Penyimpanan_Dan_Keamanan_Sistem_Informasi_Manajemen_Layanan_TI_Diskominfo_Jawa_Barat_Tahun_2026.docx';

      const key = generateSecureStorageKey(prefix, extremeUnicodeName);
      expect(key.startsWith('applications/SIM-2026-999999/')).toBe(true);
      expect(key).not.toContain('Dokumen_Pengajuan');
      const filenamePart = key.replace('applications/SIM-2026-999999/', '');
      expect(filenamePart).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.docx$/);
    });

    it('should sanitize filename correctly preserving natural Indonesian characters', () => {
      const sanitized = sanitizeFilename('  Surat Permohonan (Disdik) - Kab. Bandung.pdf  ');
      expect(sanitized).toBe('Surat Permohonan (Disdik) - Kab. Bandung.pdf');
    });
  });
});
