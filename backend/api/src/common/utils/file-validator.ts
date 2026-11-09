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

export const MAX_DEFAULT_FILE_SIZE = 10 * 1024 * 1024;

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

import * as crypto from 'crypto';

export function sanitizeFilename(filename: string): string {
  const trimmed = (filename || '').trim();
  if (!trimmed) {
    throw new BadRequestException({
      code: 'DOCUMENT_INVALID_TYPE',
      message: 'Nama berkas tidak boleh kosong.',
    });
  }

  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    throw new BadRequestException({
      code: 'DOCUMENT_INVALID_TYPE',
      message: `Nama berkas "${trimmed}" mengandung karakter kontrol atau null byte yang tidak diizinkan.`,
    });
  }

  if (trimmed.length > 255) {
    throw new BadRequestException({
      code: 'DOCUMENT_INVALID_TYPE',
      message: 'Nama berkas terlalu panjang (maksimal 255 karakter).',
    });
  }

  return trimmed;
}

export function extractSafeExtension(filename: string): string {
  const sanitized = sanitizeFilename(filename);
  const lastDotIndex = sanitized.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === sanitized.length - 1) {
    throw new BadRequestException({
      code: 'DOCUMENT_INVALID_TYPE',
      message: `Format berkas "${sanitized}" tidak valid karena tidak memiliki ekstensi file.`,
    });
  }

  const ext = sanitized.slice(lastDotIndex + 1).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new BadRequestException({
      code: 'DOCUMENT_INVALID_TYPE',
      message: `Format berkas "${sanitized}" (.${ext}) tidak didukung. Harap gunakan format PDF/Word/Excel/Gambar.`,
    });
  }

  return ext;
}

export function generateSecureStorageKey(prefix: string, filename: string): string {
  const safeExt = extractSafeExtension(filename);
  const randomUuid = crypto.randomUUID();
  const cleanPrefix = prefix.replace(/\/+$/, '');
  return `${cleanPrefix}/${randomUuid}.${safeExt}`;
}

const STRICT_BASE64_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;

export function parseAndValidateBase64(base64Input: unknown, filename?: string): Buffer {
  const displayName = filename ? `"${filename}"` : 'Dokumen';

  if (typeof base64Input !== 'string') {
    throw new BadRequestException({
      code: 'DOCUMENT_INVALID_TYPE',
      message: `Berkas ${displayName} wajib memiliki data konten biner (base64_data) yang valid dan tidak kosong. Dokumen metadata-only tidak diizinkan.`,
    });
  }

  const rawTrimmed = base64Input.trim();
  if (rawTrimmed.length === 0) {
    throw new BadRequestException({
      code: 'DOCUMENT_INVALID_TYPE',
      message: `Berkas ${displayName} wajib memiliki data konten biner (base64_data) yang valid dan tidak kosong. Dokumen metadata-only tidak diizinkan.`,
    });
  }

  let payload = rawTrimmed;

  if (rawTrimmed.startsWith('data:')) {
    const dataUrlMatch = /^data:[a-zA-Z0-9.+/_-]+;base64,(.+)$/s.exec(rawTrimmed);
    if (!dataUrlMatch || !dataUrlMatch[1]) {
      throw new BadRequestException({
        code: 'DOCUMENT_INVALID_TYPE',
        message: `Format Data URL pada berkas ${displayName} tidak valid atau rusak.`,
      });
    }
    payload = dataUrlMatch[1].trim();
  }

  if (payload.length === 0) {
    throw new BadRequestException({
      code: 'DOCUMENT_INVALID_TYPE',
      message: `Konten Base64 pada berkas ${displayName} tidak boleh kosong.`,
    });
  }

  if (payload.length % 4 !== 0) {
    throw new BadRequestException({
      code: 'DOCUMENT_INVALID_TYPE',
      message: `Data Base64 pada berkas ${displayName} tidak valid: panjang karakter harus kelipatan 4 (terdeteksi data terpotong atau padding tidak lengkap).`,
    });
  }

  if (!STRICT_BASE64_REGEX.test(payload)) {
    throw new BadRequestException({
      code: 'DOCUMENT_INVALID_TYPE',
      message: `Data Base64 pada berkas ${displayName} tidak valid: mengandung karakter asing, padding salah, atau format tidak baku.`,
    });
  }

  const buffer = Buffer.from(payload, 'base64');
  if (buffer.length === 0) {
    throw new BadRequestException({
      code: 'DOCUMENT_INVALID_TYPE',
      message: `Hasil decoding berkas ${displayName} menghasilkan konten kosong (0 bytes).`,
    });
  }

  const canonicalBase64 = buffer.toString('base64');
  if (canonicalBase64 !== payload) {
    throw new BadRequestException({
      code: 'DOCUMENT_INVALID_TYPE',
      message: `Data Base64 pada berkas ${displayName} tidak valid: canonical encoding tidak sesuai (terdapat bit padding tidak baku atau trailing data).`,
    });
  }

  return buffer;
}

export function validateUploadedFile(
  file: FileValidationInput,
  requirement?: RequirementValidationRule,
): void {
  const filename = sanitizeFilename(file.original_filename);

  const ext = extractSafeExtension(filename);

  const normalizedMime = (file.mime_type || '').trim().toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(normalizedMime)) {
    throw new BadRequestException({
      code: 'DOCUMENT_INVALID_TYPE',
      message: `Format berkas "${filename}" (${file.mime_type || 'tidak diketahui'}) tidak didukung. Harap gunakan format PDF/Word/Excel/Gambar.`,
    });
  }

  const allowedMimesForExt = EXTENSION_MIME_MAP[ext] || [];
  if (!allowedMimesForExt.includes(normalizedMime)) {
    throw new BadRequestException({
      code: 'DOCUMENT_INVALID_TYPE',
      message: `Format berkas "${filename}" (.${ext}) tidak sesuai dengan tipe MIME yang dikirimkan (${file.mime_type}).`,
    });
  }

  if (!file.buffer || file.buffer.length === 0) {
    throw new BadRequestException({
      code: 'DOCUMENT_INVALID_TYPE',
      message: `Berkas "${filename}" tidak memiliki data konten biner (buffer) yang valid. Dokumen metadata-only tidak diizinkan.`,
    });
  }

  const buf = file.buffer;

    if (buf.length >= 2 && buf[0] === 0x4d && buf[1] === 0x5a) {
      throw new BadRequestException({
        code: 'DOCUMENT_INVALID_TYPE',
        message: `Format berkas "${filename}" terdeteksi sebagai berkas executable (EXE/DLL) yang dilarang.`,
      });
    }

    if (buf.length >= 2 && buf[0] === 0x23 && buf[1] === 0x21) {
      throw new BadRequestException({
        code: 'DOCUMENT_INVALID_TYPE',
        message: `Format berkas "${filename}" terdeteksi sebagai berkas skrip yang dilarang.`,
      });
    }

    if (ext === 'pdf') {
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
      const isZip = buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b;
      if (!isZip) {
        throw new BadRequestException({
          code: 'DOCUMENT_INVALID_TYPE',
          message: `Format berkas "${filename}" tidak sesuai: berkas tidak memiliki tanda tangan Office OpenXML (ZIP) yang valid.`,
        });
      }
    } else if (ext === 'doc' || ext === 'xls') {
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

  if (file.size_bytes > MAX_DEFAULT_FILE_SIZE) {
    throw new BadRequestException(
      `Ukuran berkas "${filename}" melebihi batas maksimum 10 MB.`,
    );
  }
}
