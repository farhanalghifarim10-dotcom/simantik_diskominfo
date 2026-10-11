export const BASELINE_ALLOWED_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'jpg',
  'jpeg',
  'png',
];

export const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

export const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
};

export interface FileValidationResult {
  valid: boolean;
  errorMessage?: string;
  resolvedMime?: string;
}

/**
 * Validasi sisi klien untuk berkas unggahan permohonan SIMANTIK.
 * Memverifikasi:
 * 1. Keberadaan ekstensi file yang sah.
 * 2. Ekstensi berada dalam allowlist baseline (PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG).
 * 3. Menolak file teks (.txt), executable (.exe, .bat), script, dan file berbahaya lainnya.
 * 4. Memastikan kesesuaian dengan persyaratan layanan jika ditentukan secara spesifik (narrowing).
 * 5. Batas ukuran berkas maksimum.
 */
export function validateClientFile(
  file: File,
  allowedFileTypes?: string | null,
  maxFileSizeMb?: number | null,
): FileValidationResult {
  const filename = (file.name || '').trim();
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return {
      valid: false,
      errorMessage: `Berkas "${filename}" tidak memiliki ekstensi file yang valid.`,
    };
  }

  const ext = filename.slice(lastDot + 1).toLowerCase();
  if (!BASELINE_ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      errorMessage: `Format berkas "${filename}" (.${ext}) tidak didukung. Harap gunakan format PDF, Word, Excel, atau Gambar (.pdf, .doc, .docx, .xls, .xlsx, .jpg, .jpeg, .png).`,
    };
  }

  // Cegah tipe MIME terlarang jika dideteksi browser
  if (file.type) {
    const browserMime = file.type.toLowerCase();
    const forbiddenMimes = [
      'text/plain',
      'text/html',
      'text/javascript',
      'application/x-msdownload',
      'image/svg+xml',
    ];
    if (forbiddenMimes.includes(browserMime)) {
      return {
        valid: false,
        errorMessage: `Format berkas "${filename}" (${browserMime}) tidak didukung untuk lampiran resmi. Harap gunakan PDF, Word, Excel, atau Gambar.`,
      };
    }
  }

  const expectedMime = EXTENSION_TO_MIME[ext];
  if (!expectedMime) {
    return {
      valid: false,
      errorMessage: `Format berkas "${filename}" (.${ext}) tidak didukung.`,
    };
  }

  // Pembatasan khusus per persyaratan layanan (Narrowing)
  if (allowedFileTypes) {
    const allowedMimes = allowedFileTypes
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    if (allowedMimes.length > 0 && !allowedMimes.includes(expectedMime)) {
      const allowedExtList = allowedMimes
        .flatMap((m) => MIME_TO_EXTENSIONS[m] || [])
        .map((e) => `.${e}`)
        .join(', ');
      return {
        valid: false,
        errorMessage: `Dokumen ini memerlukan format ${allowedExtList || allowedFileTypes}. Berkas "${filename}" (.${ext}) tidak memenuhi persyaratan.`,
      };
    }
  }

  // Validasi ukuran berkas
  const maxMb = maxFileSizeMb || 10;
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      errorMessage: `Ukuran berkas "${filename}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal ${maxMb} MB.`,
    };
  }

  return {
    valid: true,
    resolvedMime: expectedMime,
  };
}

export function computeAcceptAttribute(allowedFileTypes?: string | null): string {
  if (!allowedFileTypes) {
    return '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg';
  }
  const mimes = allowedFileTypes.split(',').map((m) => m.trim().toLowerCase());
  const exts = Array.from(new Set(mimes.flatMap((m) => MIME_TO_EXTENSIONS[m] || [])));
  if (exts.length === 0) {
    return '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg';
  }
  return exts.map((e) => `.${e}`).join(',');
}

export function computeFormatDescription(
  allowedFileTypes?: string | null,
  maxFileSizeMb?: number | null,
): string {
  const maxMb = maxFileSizeMb || 10;
  if (!allowedFileTypes) {
    return `Format: PDF, Word, Excel, Gambar (Maks. ${maxMb} MB).`;
  }
  const mimes = allowedFileTypes.split(',').map((m) => m.trim().toLowerCase());
  const parts: string[] = [];
  if (mimes.includes('application/pdf')) parts.push('PDF');
  if (mimes.some((m) => m.includes('word') || m === 'application/msword')) parts.push('Word');
  if (mimes.some((m) => m.includes('spreadsheet') || m.includes('excel'))) parts.push('Excel');
  if (mimes.some((m) => m.startsWith('image/'))) parts.push('Gambar (PNG/JPG)');

  const label = parts.length > 0 ? parts.join(', ') : 'Dokumen Resmi';
  return `Format: ${label} (Maks. ${maxMb} MB).`;
}
