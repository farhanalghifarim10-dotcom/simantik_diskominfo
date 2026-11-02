export interface ExistingE2EApplication {
  id: string;
  ticket_number: string;
  current_status: string;
  title: string;
}

export interface ExistingE2EQueryResult {
  data: ExistingE2EApplication[] | null;
  error: { message: string; code?: string } | null;
}

export interface ExistingAppFinderClient {
  from(table: string): {
    select(columns: string): {
      ilike(column: string, pattern: string): {
        order(
          column: string,
          options?: { ascending?: boolean },
        ): {
          limit(count: number): Promise<ExistingE2EQueryResult>;
        };
      };
    };
  };
}

/**
 * Memeriksa apakah permohonan pengujian E2E lokal sudah ada di basis data.
 *
 * PENGAMANAN IDEMPOTENSI:
 * 1. Hanya meminta kolom yang valid di tabel public.applications: id, ticket_number, current_status, title.
 * 2. Tidak meminta kolom tracking_code yang tidak ada pada skema database (hanya tracking_code_hash yang tersimpan).
 * 3. Jika query menghasilkan error dari PostgREST/Supabase, fungsi ini WAJIB melempar exception
 *    dan TIDAK BOLEH mengembalikan null atau mengabaikan error.
 * 4. Memastikan submission baru tidak pernah dieksekusi jika verifikasi status eksisting gagal.
 */
export async function findExistingE2EApplication(
  client: ExistingAppFinderClient,
  titlePattern = '%UJI E2E LOKAL%',
): Promise<ExistingE2EApplication | null> {
  const { data, error } = await client
    .from('applications')
    .select('id, ticket_number, current_status, title')
    .ilike('title', titlePattern)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(
      `[E2E IDEMPOTENCY CHECK FAILED] Gagal memeriksa permohonan eksisting: ${error.message}. Pengujian dihentikan secara aman untuk mencegah duplikasi tiket.`,
    );
  }

  if (data && data.length > 0) {
    return data[0];
  }

  return null;
}
