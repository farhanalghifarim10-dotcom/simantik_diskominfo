export interface TechnicianAccountItem {
  id: string;
  full_name: string;
  email: string;
  role: 'TECHNICIAN';
  is_active: boolean;
  active_assignments_count: number;
  total_assignments_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTechnicianDto {
  full_name: string;
  email: string;
  password?: string;
  is_active?: boolean;
}

export interface UpdateTechnicianDto {
  full_name?: string;
  email?: string;
  password?: string;
  is_active?: boolean;
}

export interface ListTechniciansQueryDto {
  search?: string;
  is_active?: boolean;
}

export interface TechnicianDetailItem extends TechnicianAccountItem {
  recent_assignments?: Array<{
    id: string;
    application_id: string;
    ticket_number: string;
    title: string;
    is_current: boolean;
    assigned_at: string;
  }>;
}
