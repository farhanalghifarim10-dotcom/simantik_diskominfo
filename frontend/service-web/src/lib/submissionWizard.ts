import type { Service, ServiceRequirement } from '../hooks/useServices';

export interface UploadedFileState {
  requirement_id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  base64_data?: string;
}

/**
 * Mengambil daftar requirement dokumen dari layanan tertentu.
 */
export function getValidDocumentRequirements(service?: Pick<Service, 'requirements'>): ServiceRequirement[] {
  if (!service || !Array.isArray(service.requirements)) {
    return [];
  }
  return service.requirements.filter((r) => r.type === 'DOCUMENT');
}

/**
 * Menyaring berkas yang diunggah agar HANYA dokumen yang terdaftar
 * pada requirement layanan aktif yang diperhitungkan.
 * Menjamin tidak ada dokumen orphan/zombie dari kategori sebelumnya
 * dan setiap requirement ID hanya muncul satu kali.
 */
export function filterValidUploadedDocuments(
  uploadedDocuments: Record<string, UploadedFileState>,
  service?: Pick<Service, 'requirements'>,
): UploadedFileState[] {
  if (!uploadedDocuments || !service) {
    return [];
  }

  const validRequirements = getValidDocumentRequirements(service);
  const validReqIdSet = new Set(validRequirements.map((r) => r.id));

  // Ambil hanya dokumen yang requirement_id-nya sah untuk layanan ini
  const validDocs: UploadedFileState[] = [];
  const seenRequirementIds = new Set<string>();

  for (const doc of Object.values(uploadedDocuments)) {
    if (doc && validReqIdSet.has(doc.requirement_id) && !seenRequirementIds.has(doc.requirement_id)) {
      seenRequirementIds.add(doc.requirement_id);
      validDocs.push(doc);
    }
  }

  return validDocs;
}

export interface ServiceTransitionResult {
  docsChanged: boolean;
  newDocs: Record<string, UploadedFileState>;
  newExistingApplicationName: string;
  resetTerms: boolean;
  noticeMessage?: string;
}

/**
 * Mengelola transisi state formulir saat pemohon mengganti kategori layanan.
 * - Mempertahankan data pemohon dan data umum (judul, latar belakang, maksud tujuan).
 * - Membersihkan berkas lampiran jika kategori berubah karena requirement ID tidak kompatibel.
 * - Mereset field aplikasi eksisting jika beralih dari ENHANCEMENT ke DEVELOPMENT.
 * - Mereset persetujuan syarat & ketentuan.
 */
export function calculateServiceTransition(
  newService: Pick<Service, 'id' | 'name' | 'type'>,
  previousServiceId: string | null | undefined,
  currentDocs: Record<string, UploadedFileState>,
  currentExistingAppName: string,
): ServiceTransitionResult {
  const isSameService = previousServiceId === newService.id;

  if (isSameService) {
    return {
      docsChanged: false,
      newDocs: currentDocs,
      newExistingApplicationName: currentExistingAppName,
      resetTerms: false,
    };
  }

  const hadDocs = Object.keys(currentDocs).length > 0;

  // Jika layanan baru bukan ENHANCEMENT, field aplikasi eksisting direset
  const newExistingApplicationName =
    newService.type === 'ENHANCEMENT' ? currentExistingAppName : '';

  let noticeMessage: string | undefined;
  if (hadDocs) {
    noticeMessage = `Kategori diubah ke "${newService.name}". Berkas persyaratan sebelumnya telah dibersihkan. Silakan lampirkan dokumen yang sesuai pada Langkah 4.`;
  }

  return {
    docsChanged: hadDocs,
    newDocs: {}, // Bersihkan dokumen lama agar tidak terjadi duplikasi atau mismatch requirement ID
    newExistingApplicationName,
    resetTerms: true,
    noticeMessage,
  };
}
