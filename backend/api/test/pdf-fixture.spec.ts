import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  createDeterministicValidPdf,
  parseAndValidatePdfStructure,
} from './pdf-fixture.helper.js';
import { validateUploadedFile } from '../src/common/utils/file-validator.js';

describe('PDF Fixture & Structural Parser Safeguards', () => {
  describe('A. Pengujian Fixture Baru Deterministik (Valid PDF ISO 32000-1)', () => {
    it('1. Menghasilkan buffer PDF yang valid dan lolos seluruh kriteria ISO 32000-1', () => {
      const pdfBuffer = createDeterministicValidPdf('SURAT DINAS UJI E2E SIMANTIK');

      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(100);

      const result = parseAndValidatePdfStructure(pdfBuffer);

      expect(result.errors).toEqual([]);
      expect(result.isValid).toBe(true);
      expect(result.version).toBe('1.4');
      expect(result.pageCount).toBe(1);
      expect(result.hasCatalog).toBe(true);
      expect(result.hasPageTree).toBe(true);
      expect(result.hasXrefTable).toBe(true);
      expect(result.hasStartXref).toBe(true);
      expect(result.objectsCount).toBe(5);
    });

    it('2. Memastikan akurasi byte offset tabel xref pada setiap objek indirect', () => {
      const pdfBuffer = createDeterministicValidPdf();
      const raw = pdfBuffer.toString('latin1');

      // Ambil startxref
      const startXrefMatch = /startxref\s+(\d+)\s*%%EOF/s.exec(raw);
      expect(startXrefMatch).not.toBeNull();
      const xrefOffset = parseInt(startXrefMatch![1], 10);

      // Verifikasi kata kunci xref di posisi byte tepat
      expect(raw.substring(xrefOffset, xrefOffset + 4)).toBe('xref');

      // Verifikasi setiap objek 1..5 berada di byte offset yang tertulis di tabel xref
      const xrefSlice = raw.substring(xrefOffset);
      const lines = xrefSlice.split(/\r?\n/);
      expect(lines[1].trim()).toBe('0 6');

      for (let i = 1; i <= 5; i++) {
        const line = lines[2 + i].trim();
        const [offsetStr, genStr, flag] = line.split(/\s+/);
        expect(flag).toBe('n');
        expect(genStr).toBe('00000');
        const offset = parseInt(offsetStr, 10);
        expect(raw.substring(offset, offset + `${i} 0 obj`.length)).toBe(`${i} 0 obj`);
      }
    });

    it('3. Lolos validasi berkas backend SIMANTIK (file-validator.ts)', () => {
      const pdfBuffer = createDeterministicValidPdf();

      expect(() => {
        validateUploadedFile({
          original_filename: 'dokumen_uji_e2e_sah.pdf',
          mime_type: 'application/pdf',
          size_bytes: pdfBuffer.length,
          buffer: pdfBuffer,
        });
      }).not.toThrow();
    });
  });

  describe('B. Pembuktian Bahwa Header %PDF- Saja Tidak Cukup untuk Validitas PDF', () => {
    it('4. Membuktikan dummy 47 byte lama ditolak oleh parser struktural meski ber-header %PDF-', () => {
      const oldDummyPdf = '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF';
      const oldBuffer = Buffer.from(oldDummyPdf, 'latin1');

      // Validasi awal SIMANTIK saat ini (hanya magic bytes) meloloskannya:
      expect(() => {
        validateUploadedFile({
          original_filename: 'dummy_lama_47_byte.pdf',
          mime_type: 'application/pdf',
          size_bytes: oldBuffer.length,
          buffer: oldBuffer,
        });
      }).not.toThrow();

      // Namun parser struktural PDF membuktikan berkas ini cacat fatal:
      const result = parseAndValidatePdfStructure(oldBuffer);
      expect(result.isValid).toBe(false);
      expect(result.pageCount).toBe(0);
      expect(result.hasStartXref).toBe(false);
      expect(result.hasXrefTable).toBe(false);
      expect(result.hasCatalog).toBe(false);
      expect(result.hasPageTree).toBe(false);

      expect(result.errors).toContain('Pointer startxref tidak ditemukan sebelum %%EOF.');
      expect(result.errors).toContain(
        'Kamus trailer tidak memiliki entri /Root yang mengarah ke Document Catalog.',
      );
      expect(result.errors).toContain('Dokumen tidak memiliki halaman (pageCount = 0).');
    });

    it('5. Membuktikan file palsu/spoofed yang diawali %PDF- tetap terdeteksi tidak valid', () => {
      const spoofedPdf = '%PDF-1.4\nmalicious_or_plain_text_script_content_here\n%%EOF';
      const spoofedBuffer = Buffer.from(spoofedPdf, 'latin1');

      const result = parseAndValidatePdfStructure(spoofedBuffer);
      expect(result.isValid).toBe(false);
      expect(result.hasStartXref).toBe(false);
      expect(result.hasCatalog).toBe(false);
      expect(result.pageCount).toBe(0);
    });
  });

  describe('C. Uji Kompatibilitas Headless Browser (Edge / Chromium)', () => {
    it('6. Dokumen PDF deterministik dapat diproses oleh browser engine tanpa fatal viewer crash', () => {
      const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
      if (!fs.existsSync(edgePath)) {
        console.log('[SKIP] msedge.exe tidak ditemukan di lokasi standar.');
        return;
      }

      const tempDir = path.resolve('d:/Projects/simantik/scripts');
      const tempPdfPath = path.join(tempDir, 'scratch-verify-pdf.pdf');
      const tempOutPdf = path.join(tempDir, 'scratch-rendered.pdf');

      try {
        const validBuf = createDeterministicValidPdf('VERIFIKASI HEADLESS EDGE BROWSER');
        fs.writeFileSync(tempPdfPath, validBuf);

        // Uji browser headless membaca file PDF dan menghasilkan print-to-pdf output
        const cmd = `"${edgePath}" --headless=new --disable-gpu --print-to-pdf="${tempOutPdf}" "file:///${tempPdfPath.replace(/\\/g, '/')}"`;
        execSync(cmd, { stdio: 'pipe', timeout: 10000 });

        expect(fs.existsSync(tempOutPdf)).toBe(true);
        const outStat = fs.statSync(tempOutPdf);
        expect(outStat.size).toBeGreaterThan(500);
      } finally {
        if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
        if (fs.existsSync(tempOutPdf)) fs.unlinkSync(tempOutPdf);
      }
    });
  });
});
