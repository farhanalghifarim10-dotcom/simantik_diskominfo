import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

const logger = new Logger('SupabaseUtils');

/**
 * Memeriksa apakah fallback in-memory diizinkan secara eksplisit.
 * Membaca environment variables pada saat dipanggil (runtime dynamic check).
 * Bernilai true HANYA jika NODE_ENV === 'test' dan ALLOW_IN_MEMORY_FALLBACK === 'true'.
 */
export function isInMemoryFallbackAllowed(): boolean {
  return (
    process.env.NODE_ENV === 'test' &&
    process.env.ALLOW_IN_MEMORY_FALLBACK === 'true'
  );
}

/**
 * Memeriksa hasil operasi Supabase { data, error }.
 * Jika terdapat galat, melempar NestJS HttpException yang sesuai:
 * - Kode 23505 (unique_violation) -> ConflictException
 * - Kode 23503 (foreign_key_violation) -> BadRequestException
 * - Lainnya -> InternalServerErrorException (pesan generik ke klien, detail dicatat di server log)
 */
export function assertSupabaseOk<T = any>(
  res: { data?: T | null; error?: any },
  contextMessage: string = 'Operasi basis data gagal',
): T {
  if (!res || !res.error) {
    return res?.data as T;
  }

  const err = res.error;
  const errorCode = err.code ? String(err.code) : undefined;
  const errorMessage = err.message || JSON.stringify(err);

  logger.error(
    `[SupabaseError] ${contextMessage}: code=${errorCode || 'UNKNOWN'}, message=${errorMessage}`,
  );

  if (errorCode === '23505') {
    throw new ConflictException(
      'Data yang dimasukkan mengalami konflik atau sudah terdaftar sebelumnya.',
    );
  }

  if (errorCode === '23503') {
    throw new BadRequestException(
      'Referensi data tidak valid atau entitas terkait tidak ditemukan.',
    );
  }

  throw new InternalServerErrorException(
    contextMessage || 'Terjadi kesalahan pada basis data saat memproses permintaan.',
  );
}
