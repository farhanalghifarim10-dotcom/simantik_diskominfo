import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { validateUploadedFile } from './file-validator.js';

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
});
