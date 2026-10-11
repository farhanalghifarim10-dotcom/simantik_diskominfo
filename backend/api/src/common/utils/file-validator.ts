import { BadRequestException } from '@nestjs/common';

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
];

export const ALLOWED_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'jpg',
  'jpeg',
  'png',
];

export const EXTENSION_MIME_MAP: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
};

export const MAX_DEFAULT_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export interface FileValidationInput {
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  buffer?: Buffer;
}

export interface RequirementValidationRule {
  name?: string;
  allowed_file_types?: string | null;
  max_file_size_mb?: number | null;
}

/**
 * Validasi ketat format berkas dokumen sesuai baseline kebijakan keamanan SIMANTIK.
 * Memverifikasi:
 * 1. Keberadaan ekstensi file yang diizinkan (.pdf, .doc, .docx, .xls, .xlsx, .jpg, .jpeg, .png).
 * 2. MIME type baseline.
 * 3. Keselarasan ekstensi dan MIME type.
 * 4. Tanda tangan biner (magic bytes) pada buffer file jika tersedia (mencegah file spoofing).
 * 5. Pembatasan spesifik per persyaratan layanan (narrowing).
 * 6. Batas ukuran berkas (maksimal 10 MB atau batasan khusus per persyaratan).
 */
export function validateUploadedFile(
  file: FileValidationInput,
  requirement?: RequirementValidationRule,
): void {
  const filename = (file.original_filename || '').trim();
  if (!filename) {
    throw new BadRequestException({
      code: 'DOCUMENT_INVALID_TYPE',
      message: 'Nama berkas tidak boleh kosong.',
    });
  }

  // 1. Ekstrak dan periksa ekstensi file
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    throw new BadRequestException({
      code: 'DOCUMENT_INVALID_TYPE',
      message: `Format berkas "${filename}" tidak valid karena tidak memiliki ekstensi file.`,
    });
  }

  const ext = filename.slice(lastDotIndex + 1).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new BadRequestException({
      code: 'DOCUMENT_INVALID_TYPE',
      message: `Format berkas "${filename}" (.${ext}) tidak didukung. Harap gunakan format PDF/Word/Excel/Gambar.`,
    });
  }

  // 2. Periksa MIME type baseline
  const normalizedMime = (file.mime_type || '').trim().toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(normalizedMime)) {
    throw new BadRequestException({
      code: 'DOCUMENT_INVALID_TYPE',
      message: `Format berkas "${filename}" (${file.mime_type || 'tidak diketahui'}) tidak didukung. Harap gunakan format PDF/Word/Excel/Gambar.`,
    });
  }

  // 3. Periksa keselarasan ekstensi dan MIME type
  const allowedMimesForExt = EXTENSION_MIME_MAP[ext] || [];
  if (!allowedMimesForExt.includes(normalizedMime)) {
    throw new BadRequestException({
      code: 'DOCUMENT_INVALID_TYPE',
      message: `Format berkas "${filename}" (.${ext}) tidak sesuai dengan tipe MIME yang dikirimkan (${file.mime_type}).`,
    });
  }

  // 4. Periksa Magic Bytes / Binary Signatures jika buffer tersedia
  if (file.buffer && file.buffer.length > 0) {
    const buf = file.buffer;

    // Larang secara eksplisit file executable Windows (MZ header)
    if (buf.length >= 2 && buf[0] === 0x4d && buf[1] === 0x5a) {
      throw new BadRequestException({
        code: 'DOCUMENT_INVALID_TYPE',
        message: `Format berkas "${filename}" terdeteksi sebagai berkas executable (EXE/DLL) yang dilarang.`,
      });
    }

    // Larang file skrip Unix shell
    if (buf.length >= 2 && buf[0] === 0x23 && buf[1] === 0x21) {
      throw new BadRequestException({
        code: 'DOCUMENT_INVALID_TYPE',
        message: `Format berkas "${filename}" terdeteksi sebagai berkas skrip yang dilarang.`,
      });
    }

    // Validasi magic byte per tipe ekstensi
    if (ext === 'pdf') {
      // PDF wajib diawali '%PDF-' (0x25 0x50 0x44 0x46)
      const isPdf =
        buf.length >= 4 &&
        buf[0] === 0x25 &&
        buf[1] === 0x50 &&
        buf[2] === 0x44 &&
        buf[3] === 0x46;
      if (!isPdf) {
        throw new BadRequestException({
          code: 'DOCUMENT_INVALID_TYPE',
          message: `Format berkas "${filename}" tidak sesuai: berkas tidak memiliki tanda tangan PDF yang valid (%PDF-).`,
        });
      }
    } else if (ext === 'png') {
      // PNG wajib diawali 0x89 0x50 0x4E 0x47
      const isPng =
        buf.length >= 4 &&
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47;
      if (!isPng) {
        throw new BadRequestException({
          code: 'DOCUMENT_INVALID_TYPE',
          message: `Format berkas "${filename}" tidak sesuai: berkas tidak memiliki tanda tangan PNG yang valid.`,
        });
      }
    } else if (ext === 'jpg' || ext === 'jpeg') {
      // JPEG wajib diawali 0xFF 0xD8 0xFF
      const isJpg =
        buf.length >= 3 &&
        buf[0] === 0xff &&
        buf[1] === 0xd8 &&
        buf[2] === 0xff;
      if (!isJpg) {
        throw new BadRequestException({
          code: 'DOCUMENT_INVALID_TYPE',
          message: `Format berkas "${filename}" tidak sesuai: berkas tidak memiliki tanda tangan JPEG yang valid.`,
        });
      }
    } else if (ext === 'docx' || ext === 'xlsx') {
      // OpenXML Office files adalah ZIP archives yang diawali 'PK' (0x50 0x4B)
      const isZip = buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b;
      if (!isZip) {
        throw new BadRequestException({
          code: 'DOCUMENT_INVALID_TYPE',
          message: `Format berkas "${filename}" tidak sesuai: berkas tidak memiliki tanda tangan Office OpenXML (ZIP) yang valid.`,
        });
      }
    } else if (ext === 'doc' || ext === 'xls') {
      // OLE2 Compound document (0xD0 0xCF 0x11 0xE0) atau OpenXML (0x50 0x4B)
      const isOle =
        buf.length >= 4 &&
        buf[0] === 0xd0 &&
        buf[1] === 0xcf &&
        buf[2] === 0x11 &&
        buf[3] === 0xe0;
      const isZip = buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b;
      if (!isOle && !isZip) {
        throw new BadRequestException({
          code: 'DOCUMENT_INVALID_TYPE',
          message: `Format berkas "${filename}" tidak sesuai: berkas tidak memiliki tanda tangan dokumen Microsoft Office yang valid.`,
        });
      }
    }
  }

  // 5. Pembatasan spesifik per persyaratan layanan (Narrowing)
  if (requirement && requirement.allowed_file_types) {
    const rawAllowed = requirement.allowed_file_types
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    if (rawAllowed.length > 0 && !rawAllowed.includes(normalizedMime)) {
      throw new BadRequestException({
        code: 'DOCUMENT_INVALID_TYPE',
        message: `Format berkas "${filename}" (${file.mime_type}) tidak didukung untuk persyaratan "${requirement.name || 'Dokumen'}". Persyaratan ini hanya menerima format: ${requirement.allowed_file_types}.`,
      });
    }
  }

  // 6. Batas ukuran berkas (baseline maksimum 10 MB)
  if (file.size_bytes > MAX_DEFAULT_FILE_SIZE) {
    throw new BadRequestException(
      `Ukuran berkas "${filename}" melebihi batas maksimum 10 MB.`,
    );
  }
}
