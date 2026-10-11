export type ServiceType = 'DEVELOPMENT' | 'ENHANCEMENT';

export type RequirementType = 'DOCUMENT' | 'DATA' | 'CONFIRMATION';

export interface ServiceRequirementEntity {
  id: string;
  service_id: string;
  name: string;
  description: string | null;
  type: RequirementType;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
  allowed_file_types?: string | null;
  max_file_size_mb?: number | null;
  is_placeholder?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceEntity {
  id: string;
  code: string;
  slug: string;
  name: string;
  type: ServiceType;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  requirements?: ServiceRequirementEntity[];
}

export interface CreateServiceDto {
  code: string;
  name: string;
  type: ServiceType;
  slug?: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateServiceDto {
  name?: string;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface CreateRequirementDto {
  name: string;
  description?: string;
  type: RequirementType;
  is_required?: boolean;
  sort_order?: number;
  is_active?: boolean;
  allowed_file_types?: string;
  max_file_size_mb?: number;
  is_placeholder?: boolean;
}

export interface UpdateRequirementDto {
  name?: string;
  description?: string;
  type?: RequirementType;
  is_required?: boolean;
  sort_order?: number;
  is_active?: boolean;
  allowed_file_types?: string;
  max_file_size_mb?: number;
  is_placeholder?: boolean;
}
