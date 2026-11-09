import type { Service, ServiceRequirement } from '../hooks/useServices';

export interface UploadedFileState {
  requirement_id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  base64_data?: string;
}

export function getValidDocumentRequirements(service?: Pick<Service, 'requirements'>): ServiceRequirement[] {
  if (!service || !Array.isArray(service.requirements)) {
    return [];
  }
  return service.requirements.filter((r) => r.type === 'DOCUMENT');
}

export function filterValidUploadedDocuments(
  uploadedDocuments: Record<string, UploadedFileState>,
  service?: Pick<Service, 'requirements'>,
): UploadedFileState[] {
  if (!uploadedDocuments || !service) {
    return [];
  }

  const validRequirements = getValidDocumentRequirements(service);
  const validReqIdSet = new Set(validRequirements.map((r) => r.id));

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
