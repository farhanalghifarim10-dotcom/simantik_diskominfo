/**
 * Fixture PDF generator deterministik dan parser struktural untuk pengujian SIMANTIK.
 *
 * Mengikuti spesifikasi PDF 1.4 (ISO 32000-1) secara presisi:
 * - Header %PDF-1.4 dengan komentar biner 4 byte (> 127).
 * - Object 1: Document Catalog (/Type /Catalog /Pages 2 0 R).
 * - Object 2: Page Tree (/Type /Pages /Kids [3 0 R] /Count 1).
 * - Object 3: Page (/Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources /Contents).
 * - Object 4: Standard Type1 Font (/Type /Font /Subtype /Type1 /BaseFont /Helvetica).
 * - Object 5: Content stream dengan teks visual dan deklarasi /Length yang presisi.
 * - Cross-Reference table (xref) dengan offset byte 10-digit pad yang akurat untuk setiap objek.
 * - Trailer dengan /Size dan /Root yang valid.
 * - startxref pointer menuju offset byte xref yang presisi.
 * - End of file marker (%%EOF).
 */

export interface PdfStructureValidationResult {
  isValid: boolean;
  errors: string[];
  version: string | null;
  pageCount: number;
  hasCatalog: boolean;
  hasPageTree: boolean;
  hasXrefTable: boolean;
  hasStartXref: boolean;
  xrefOffset: number | null;
  objectsCount: number;
}

/**
 * Menghasilkan Buffer berkas PDF satu halaman yang valid, deterministik, dan dapat dibuka di semua PDF Viewer.
 */
export function createDeterministicValidPdf(text = 'SIMANTIK UJI E2E LOKAL'): Buffer {
  const sanitizedText = text.replace(/[\r\n()\\]/g, ' ');
  const contentStream = `BT\n/F1 12 Tf\n72 720 Td\n(${sanitizedText}) Tj\nET\n`;
  const streamLength = Buffer.byteLength(contentStream, 'ascii');

  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';

  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 =
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n';
  const obj4 = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  const obj5 = `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}endstream\nendobj\n`;

  let offset = Buffer.byteLength(header, 'ascii');
  const offset1 = offset;
  offset += Buffer.byteLength(obj1, 'ascii');
  const offset2 = offset;
  offset += Buffer.byteLength(obj2, 'ascii');
  const offset3 = offset;
  offset += Buffer.byteLength(obj3, 'ascii');
  const offset4 = offset;
  offset += Buffer.byteLength(obj4, 'ascii');
  const offset5 = offset;
  offset += Buffer.byteLength(obj5, 'ascii');

  const xrefOffset = offset;

  const pad10 = (n: number) => String(n).padStart(10, '0');

  const xref =
    'xref\n' +
    '0 6\n' +
    '0000000000 65535 f \n' +
    `${pad10(offset1)} 00000 n \n` +
    `${pad10(offset2)} 00000 n \n` +
    `${pad10(offset3)} 00000 n \n` +
    `${pad10(offset4)} 00000 n \n` +
    `${pad10(offset5)} 00000 n \n`;

  const trailer =
    'trailer\n' +
    '<< /Size 6 /Root 1 0 R >>\n' +
    'startxref\n' +
    `${xrefOffset}\n` +
    '%%EOF\n';

  const fullPdfString = header + obj1 + obj2 + obj3 + obj4 + obj5 + xref + trailer;
  return Buffer.from(fullPdfString, 'ascii');
}

/**
 * Parser struktural PDF mandiri untuk memverifikasi integritas spesifikasi PDF (ISO 32000-1).
 * Memeriksa:
 * 1. Header %PDF-<version>
 * 2. Posisi EOF dan pointer startxref
 * 3. Keberadaan dan validitas tabel xref serta akurasi pointer byte offset objek
 * 4. Kamus trailer dan pointer /Root Document Catalog
 * 5. Document Catalog (/Type /Catalog) dan Page Tree (/Type /Pages)
 * 6. Keberadaan setidaknya 1 halaman valid (/Type /Page)
 */
export function parseAndValidatePdfStructure(buf: Buffer): PdfStructureValidationResult {
  const errors: string[] = [];
  const raw = buf.toString('latin1');

  // 1. Header
  const headerMatch = /^%PDF-(\d+\.\d+)/.exec(raw);
  const version = headerMatch ? headerMatch[1] : null;
  if (!headerMatch) {
    errors.push('Berkas tidak diawali header PDF yang valid (%PDF-<version>).');
  }

  // 2. EOF marker
  const eofIndex = raw.lastIndexOf('%%EOF');
  if (eofIndex === -1) {
    errors.push('Berkas tidak memiliki penanda akhir %%EOF.');
  }

  // 3. startxref
  let xrefOffset: number | null = null;
  let hasStartXref = false;
  if (eofIndex !== -1) {
    const preEof = raw.substring(Math.max(0, eofIndex - 128), eofIndex);
    const startXrefMatch = /startxref\s+(\d+)\s*$/.exec(preEof.trim());
    if (startXrefMatch) {
      hasStartXref = true;
      xrefOffset = parseInt(startXrefMatch[1], 10);
    } else {
      errors.push('Pointer startxref tidak ditemukan sebelum %%EOF.');
    }
  }

  // 4. xref table
  let hasXrefTable = false;
  let objectsCount = 0;
  const objectOffsets: Map<number, number> = new Map();

  if (xrefOffset !== null && xrefOffset < buf.length) {
    const xrefSubstring = raw.substring(xrefOffset);
    if (xrefSubstring.startsWith('xref')) {
      hasXrefTable = true;
      const lines = xrefSubstring.split(/\r?\n/);
      if (lines.length >= 2) {
        const headerParts = lines[1].trim().split(/\s+/);
        const startObj = parseInt(headerParts[0], 10);
        const count = parseInt(headerParts[1], 10);

        for (let i = 0; i < count; i++) {
          const entryLine = lines[2 + i];
          if (!entryLine) break;
          const entryParts = entryLine.trim().split(/\s+/);
          if (entryParts.length >= 3) {
            const entryOffset = parseInt(entryParts[0], 10);
            const status = entryParts[2];
            const objNum = startObj + i;
            if (status === 'n') {
              objectOffsets.set(objNum, entryOffset);
              objectsCount++;

              // Verifikasi apakah byte offset benar-benar menunjuk ke "<num> 0 obj"
              const targetSlice = raw.substring(entryOffset, entryOffset + 32);
              const expectedObjStart = `${objNum} 0 obj`;
              if (!targetSlice.startsWith(expectedObjStart)) {
                errors.push(
                  `Byte offset tabel xref untuk objek ${objNum} (${entryOffset}) tidak menunjuk ke "${expectedObjStart}".`,
                );
              }
            }
          }
        }
      }
    } else {
      errors.push(`Posisi startxref (${xrefOffset}) tidak diawali kata kunci 'xref'.`);
    }
  } else if (xrefOffset !== null) {
    errors.push(`Offset startxref (${xrefOffset}) melebihi ukuran file (${buf.length} byte).`);
  }

  // 5. Trailer & /Root Catalog
  let hasCatalog = false;
  let rootObjNum: number | null = null;
  const trailerMatch = /trailer\s*<<([^>]*)>>/s.exec(raw);
  if (trailerMatch) {
    const trailerDict = trailerMatch[1];
    const rootMatch = /\/Root\s+(\d+)\s+0\s+R/.exec(trailerDict);
    if (rootMatch) {
      rootObjNum = parseInt(rootMatch[1], 10);
    } else {
      errors.push('Kamus trailer tidak memiliki entri /Root yang mengarah ke Document Catalog.');
    }
  } else {
    errors.push('Kamus trailer tidak ditemukan.');
  }

  // 6. Verifikasi Catalog Object
  let hasPageTree = false;
  let pagesObjNum: number | null = null;
  if (rootObjNum !== null) {
    const rootRegex = new RegExp(`${rootObjNum}\\s+0\\s+obj\\s*<<([^>]*)>>`, 's');
    const catalogMatch = rootRegex.exec(raw);
    if (catalogMatch) {
      const catalogContent = catalogMatch[1];
      if (catalogContent.includes('/Type /Catalog') || catalogContent.includes('/Type/Catalog')) {
        hasCatalog = true;
        const pagesMatch = /\/Pages\s+(\d+)\s+0\s+R/.exec(catalogContent);
        if (pagesMatch) {
          pagesObjNum = parseInt(pagesMatch[1], 10);
        } else {
          errors.push('Document Catalog tidak memiliki referensi /Pages.');
        }
      } else {
        errors.push(`Objek ${rootObjNum} yang ditunjuk /Root bukan /Type /Catalog.`);
      }
    } else {
      errors.push(`Objek Document Catalog ${rootObjNum} 0 obj tidak ditemukan.`);
    }
  }

  // 7. Verifikasi Pages Tree & Page Count
  let pageCount = 0;
  if (pagesObjNum !== null) {
    const pagesRegex = new RegExp(`${pagesObjNum}\\s+0\\s+obj\\s*<<([^>]*)>>`, 's');
    const pagesMatch = pagesRegex.exec(raw);
    if (pagesMatch) {
      const pagesContent = pagesMatch[1];
      if (pagesContent.includes('/Type /Pages') || pagesContent.includes('/Type/Pages')) {
        hasPageTree = true;
        const countMatch = /\/Count\s+(\d+)/.exec(pagesContent);
        if (countMatch) {
          pageCount = parseInt(countMatch[1], 10);
        }
      } else {
        errors.push(`Objek ${pagesObjNum} bukan /Type /Pages.`);
      }
    } else {
      errors.push(`Objek Page Tree ${pagesObjNum} 0 obj tidak ditemukan.`);
    }
  }

  if (pageCount === 0) {
    errors.push('Dokumen tidak memiliki halaman (pageCount = 0).');
  }

  return {
    isValid: errors.length === 0,
    errors,
    version,
    pageCount,
    hasCatalog,
    hasPageTree,
    hasXrefTable,
    hasStartXref,
    xrefOffset,
    objectsCount,
  };
}
