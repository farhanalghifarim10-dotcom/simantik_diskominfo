export interface OpdUnitItem {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  application_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateOpdDto {
  code: string;
  name: string;
  is_active?: boolean;
}

export interface UpdateOpdDto {
  code?: string;
  name?: string;
  is_active?: boolean;
}

export interface ListOpdQueryDto {
  search?: string;
  is_active?: boolean;
}
