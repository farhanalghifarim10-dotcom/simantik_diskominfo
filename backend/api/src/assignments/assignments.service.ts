import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { assertSupabaseOk, isInMemoryFallbackAllowed } from '../common/utils/supabase.utils.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { AdminApplicationsService } from '../applications/admin-applications.service.js';
import type {
  ApplicationStatus,
  ExecuteStageTransitionDto,
  ExecuteTransitionDto,
} from '../applications/workflow/workflow.types.js';
import type {
  ApplicationAssignmentsResponse,
  AssignmentHistoryItem,
  CreateAssignmentDto,
  ListTechnicianWorkQueryDto,
  PaginatedTechnicianWorkResponse,
  TechnicianProfileItem,
  TechnicianWorkItem,
  TechnicianWorkSummary,
} from './assignments.types.js';

export const DEFAULT_MOCK_TECHNICIANS: TechnicianProfileItem[] = [
  {
    id: 't1111111-1111-1111-1111-111111111111',
    full_name: 'Ahmad Fauzi, S.Kom',
    email: 'ahmad.fauzi@bandungkab.go.id',
    role: 'TECHNICIAN',
    is_active: true,
    active_assignments_count: 0,
  },
  {
    id: 't2222222-2222-2222-2222-222222222222',
    full_name: 'Siti Rahmawati, S.Tr.Kom',
    email: 'siti.rahmawati@bandungkab.go.id',
    role: 'TECHNICIAN',
    is_active: true,
    active_assignments_count: 0,
  },
  {
    id: 't3333333-3333-3333-3333-333333333333',
    full_name: 'Hendra Wijaya, A.Md.Kom',
    email: 'hendra.wijaya@bandungkab.go.id',
    role: 'TECHNICIAN',
    is_active: true,
    active_assignments_count: 0,
  },
];

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);
  // In-memory assignment store for fallback and unit test consistency
  private inMemoryAssignments: Map<string, AssignmentHistoryItem[]> = new Map();
  private inMemoryTechnicians: TechnicianProfileItem[] = isInMemoryFallbackAllowed()
    ? [...DEFAULT_MOCK_TECHNICIANS]
    : [];

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly adminApplicationsService: AdminApplicationsService,
  ) {
    this.seedInitialAssignment();
  }

  private seedInitialAssignment() {
    if (!isInMemoryFallbackAllowed()) {
      return;
    }
    const seedAppId = 'a1000000-0000-0000-0000-000000000001';
    const now = new Date().toISOString();
    const initialAssignment: AssignmentHistoryItem = {
      id: 'asgn-seed-001',
      application_id: seedAppId,
      technician_id: 't1111111-1111-1111-1111-111111111111',
      technician_name: 'Ahmad Fauzi, S.Kom',
      technician_email: 'ahmad.fauzi@bandungkab.go.id',
      assigned_by_id: 'u-admin-1',
      assigned_by_name: 'Budi Santoso, S.Kom (Super Admin)',
      note: 'Ditugaskan untuk analisis teknis dan integrasi API Bapenda.',
      assigned_at: now,
      unassigned_at: null,
      is_current: true,
    };
    this.inMemoryAssignments.set(seedAppId, [initialAssignment]);
  }

  /**
   * 1. Daftar teknisi aktif beserta beban kerja aktif masing-masing
   */
  async listTechnicians(): Promise<TechnicianProfileItem[]> {
    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('profiles')
        .select('id, full_name, role, is_active')
        .eq('role', 'TECHNICIAN')
        .eq('is_active', true);

      if (!error && data && data.length > 0) {
        // Hitung active assignments untuk masing-masing teknisi berdasarkan status tiket aktif
        const { data: currentAssignments } = await client
          .from('assignments')
          .select('technician_id, application_id')
          .eq('is_current', true);

        const terminalStatuses = ['COMPLETED', 'CLOSED', 'REJECTED', 'CANCELLED'];
        const appStatusMap = new Map<string, string>();

        if (currentAssignments && currentAssignments.length > 0) {
          const appIds = [...new Set(currentAssignments.map((a: any) => a.application_id).filter(Boolean))];
          if (appIds.length > 0) {
            const { data: apps } = await client
              .from('applications')
              .select('id, current_status')
              .in('id', appIds);

            (apps || []).forEach((app: any) => {
              appStatusMap.set(app.id, app.current_status);
            });
          }
        }

        const countMap = new Map<string, number>();
        (currentAssignments || []).forEach((asgn: any) => {
          const status = asgn.application_id ? appStatusMap.get(asgn.application_id) : undefined;
          const isAppActive = appStatusMap.size === 0
            ? true
            : Boolean(status && !terminalStatuses.includes(status));
          if (isAppActive) {
            countMap.set(asgn.technician_id, (countMap.get(asgn.technician_id) || 0) + 1);
          }
        });

        return data.map((t: any) => ({
          id: t.id,
          full_name: t.full_name,
          email: `${t.full_name.toLowerCase().replace(/[^a-z]/g, '')}@bandungkab.go.id`,
          role: 'TECHNICIAN',
          is_active: t.is_active,
          active_assignments_count: countMap.get(t.id) || 0,
        }));
      }

      if (error) {
        if (!isInMemoryFallbackAllowed()) {
          throw new InternalServerErrorException(
            `Gagal memuat daftar teknisi dari basis data: ${error.message || JSON.stringify(error)}`,
          );
        }
      }
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException(
          `Gagal memuat daftar teknisi dari basis data: ${err?.message || 'Database error'}`,
        );
      }
    }

    if (!isInMemoryFallbackAllowed()) {
      throw new InternalServerErrorException('Gagal memuat daftar teknisi dari basis data.');
    }

    // In-memory fallback: hitung beban kerja aktif
    const activeCountMap = new Map<string, number>();
    const terminalStatuses = ['COMPLETED', 'CLOSED', 'REJECTED', 'CANCELLED'];

    for (const [appId, list] of this.inMemoryAssignments.entries()) {
      const current = list.find((a) => a.is_current);
      if (current) {
        let isAppActive = true;
        try {
          const app = await this.adminApplicationsService.getApplicationDetail(appId, {
            id: 'system',
            email: null,
            role: 'SUPER_ADMIN',
            fullName: 'System',
          });
          if (app && terminalStatuses.includes(app.current_status)) {
            isAppActive = false;
          }
        } catch {
          // Fallback if app cannot be retrieved
        }

        if (isAppActive) {
          activeCountMap.set(
            current.technician_id,
            (activeCountMap.get(current.technician_id) || 0) + 1,
          );
        }
      }
    }

    return this.inMemoryTechnicians.map((t) => ({
      ...t,
      active_assignments_count: activeCountMap.get(t.id) || 0,
    }));
  }

  /**
   * 2. Riwayat dan status penugasan terkini pada suatu permohonan
   */
  async getApplicationAssignments(
    applicationId: string,
  ): Promise<ApplicationAssignmentsResponse> {
    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('assignments')
        .select(`
          id,
          application_id,
          technician_id,
          assigned_by,
          note,
          assigned_at,
          unassigned_at,
          is_current,
          technician:technician_id(id, full_name),
          assigner:assigned_by(id, full_name)
        `)
        .eq('application_id', applicationId)
        .order('assigned_at', { ascending: false });

      if (!error && data) {
        const history: AssignmentHistoryItem[] = data.map((row: any) => ({
          id: row.id,
          application_id: row.application_id,
          technician_id: row.technician_id,
          technician_name: row.technician?.full_name || 'Tenaga Ahli TI',
          assigned_by_id: row.assigned_by,
          assigned_by_name: row.assigner?.full_name || 'Administrator',
          note: row.note,
          assigned_at: row.assigned_at,
          unassigned_at: row.unassigned_at,
          is_current: row.is_current,
        }));

        const current = history.find((h) => h.is_current) || null;
        return {
          current_assignment: current,
          assignment_history: history,
        };
      }

      if (error) {
        if (!isInMemoryFallbackAllowed()) {
          throw new InternalServerErrorException(
            `Gagal memuat riwayat penugasan dari basis data: ${error.message || JSON.stringify(error)}`,
          );
        }
      }
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException(
          `Gagal memuat riwayat penugasan dari basis data: ${err?.message || 'Database error'}`,
        );
      }
    }

    if (!isInMemoryFallbackAllowed()) {
      throw new InternalServerErrorException('Gagal memuat riwayat penugasan dari basis data.');
    }

    const list = this.inMemoryAssignments.get(applicationId) || [];
    const current = list.find((a) => a.is_current) || null;

    return {
      current_assignment: current,
      assignment_history: list,
    };
  }

  /**
   * 3. Penugasan / Re-assignment Teknisi Utama oleh SUPER_ADMIN
   */
  async assignTechnician(
    applicationId: string,
    dto: CreateAssignmentDto,
    adminUser: AuthenticatedUser,
  ): Promise<AssignmentHistoryItem> {
    if (adminUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Hanya SUPER_ADMIN yang berwenang melakukan penugasan tenaga ahli.');
    }

    // Validasi permohonan ada
    const app = await this.adminApplicationsService.getApplicationDetail(applicationId, adminUser);

    const nonAssignableStatuses = ['COMPLETED', 'CLOSED', 'REJECTED', 'CANCELLED'];
    if (nonAssignableStatuses.includes(app.current_status)) {
      throw new BadRequestException(
        `Tidak dapat menugaskan tenaga ahli pada permohonan dengan status [${app.current_status}].`,
      );
    }

    // Validasi teknisi valid & aktif
    const technicians = await this.listTechnicians();
    const technician = technicians.find((t) => t.id === dto.technician_id);
    if (!technician) {
      throw new NotFoundException(`Tenaga ahli dengan ID [${dto.technician_id}] tidak ditemukan atau tidak aktif.`);
    }

    const now = new Date().toISOString();
    const currentAssignments = await this.getApplicationAssignments(applicationId);
    const existingCurrent = currentAssignments.current_assignment;
    const isReassignment = Boolean(existingCurrent && existingCurrent.technician_id !== dto.technician_id);

    const newId = crypto.randomUUID();
    let oldAssignmentClosed = false;

    try {
      const client = this.supabaseService.getClient();

      // a. Jika ada penugasan aktif sebelumnya, nonaktifkan (archive)
      if (existingCurrent) {
        const updateOldRes = await client
          .from('assignments')
          .update({
            is_current: false,
            unassigned_at: now,
          })
          .eq('id', existingCurrent.id);
        assertSupabaseOk(updateOldRes, 'Gagal menonaktifkan penugasan tenaga ahli sebelumnya');
        oldAssignmentClosed = true;
      }

      // b. Insert penugasan baru
      const insertNewRes = await client.from('assignments').insert({
        id: newId,
        application_id: applicationId,
        technician_id: dto.technician_id,
        assigned_by: adminUser.id,
        note: dto.note?.trim() || null,
        assigned_at: now,
        is_current: true,
      });

      if (insertNewRes?.error) {
        // Kompensasi: jika insert gagal setelah penugasan lama ditutup, kembalikan penugasan lama
        if (oldAssignmentClosed && existingCurrent) {
          try {
            await client
              .from('assignments')
              .update({
                is_current: true,
                unassigned_at: null,
              })
              .eq('id', existingCurrent.id);
          } catch (revertErr) {
            this.logger.warn(`Gagal melakukan kompensasi rollback penugasan sebelumnya: ${revertErr}`);
          }
        }
        assertSupabaseOk(insertNewRes, 'Gagal menyimpan penugasan tenaga ahli baru');
      }

      // c. Audit Log (efek samping sekunder)
      try {
        const auditRes = await client.from('audit_logs').insert({
          actor_profile_id: adminUser.id,
          application_id: applicationId,
          action: isReassignment ? 'APPLICATION_REASSIGNED' : 'APPLICATION_ASSIGNED',
          entity_type: 'assignments',
          entity_id: newId,
          old_data: existingCurrent
            ? { technician_id: existingCurrent.technician_id, technician_name: existingCurrent.technician_name }
            : null,
          new_data: {
            technician_id: dto.technician_id,
            technician_name: technician.full_name,
            note: dto.note || null,
          },
          created_at: now,
        });
        if (auditRes?.error) {
          this.logger.warn(`Gagal mencatat audit log penugasan: ${auditRes.error.message}`);
        }
      } catch (auditErr) {
        this.logger.warn(`Gagal mencatat audit log penugasan: ${auditErr}`);
      }

      // d. Simpan pesan internal penugasan (efek samping sekunder)
      try {
        const msgRes = await client.from('messages').insert({
          application_id: applicationId,
          sender_type: 'ADMIN',
          sender_profile_id: adminUser.id,
          sender_name: adminUser.fullName,
          visibility: 'INTERNAL',
          message: isReassignment
            ? `[PENUGASAN ULANG] Teknisi dialihkan dari ${existingCurrent?.technician_name} ke ${technician.full_name}. Catatan: ${dto.note || '-'}`
            : `[PENUGASAN] Ditugaskan kepada ${technician.full_name}. Catatan: ${dto.note || '-'}`,
          created_at: now,
        });
        if (msgRes?.error) {
          this.logger.warn(`Gagal mencatat pesan internal penugasan: ${msgRes.error.message}`);
        }
      } catch (msgErr) {
        this.logger.warn(`Gagal mencatat pesan internal penugasan: ${msgErr}`);
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal memproses penugasan tenaga ahli.');
      }
    }

    const newAssignment: AssignmentHistoryItem = {
      id: newId,
      application_id: applicationId,
      technician_id: dto.technician_id,
      technician_name: technician.full_name,
      technician_email: technician.email,
      assigned_by_id: adminUser.id,
      assigned_by_name: adminUser.fullName,
      note: dto.note?.trim() || null,
      assigned_at: now,
      unassigned_at: null,
      is_current: true,
    };

    // In-memory store updates
    if (isInMemoryFallbackAllowed()) {
      const list = this.inMemoryAssignments.get(applicationId) || [];
      if (existingCurrent) {
        existingCurrent.is_current = false;
        existingCurrent.unassigned_at = now;
      }
      list.unshift(newAssignment);
      this.inMemoryAssignments.set(applicationId, list);

      this.adminApplicationsService.unassignTechniciansInMemory(applicationId);
      this.adminApplicationsService.assignTechnicianInMemory(applicationId, dto.technician_id);
    }

    return newAssignment;
  }

  /**
   * 4. Memeriksa otorisasi penugasan teknisi (Backend Authoritative Enforcement)
   */
  async checkTechnicianAuthorization(
    applicationId: string,
    technicianId: string,
  ): Promise<boolean> {
    const assignments = await this.getApplicationAssignments(applicationId);
    return assignments.current_assignment?.technician_id === technicianId;
  }

  /**
   * 5. Ringkasan beban kerja teknisi (Workload Summary Metrics)
   */
  async getTechnicianWorkSummary(technicianId: string): Promise<TechnicianWorkSummary> {
    const allWork = await this.getTechnicianMyWork(technicianId, { page_size: 1000 });
    const items = allWork.items;

    return {
      total_assigned: allWork.total,
      in_progress_count: items.filter((i) => i.current_status === 'IN_PROGRESS').length,
      approved_pending_count: items.filter((i) => i.current_status === 'APPROVED').length,
      completed_count: items.filter((i) => i.current_status === 'COMPLETED').length,
    };
  }

  /**
   * 6. Daftar pekerjaan yang ditugaskan kepada teknisi ("My Work")
   */
  async getTechnicianMyWork(
    technicianId: string,
    query: ListTechnicianWorkQueryDto,
  ): Promise<PaginatedTechnicianWorkResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.max(1, Math.min(1000, Number(query.page_size) || 10));
    const terminalStatuses: ApplicationStatus[] = [
      'COMPLETED',
      'CLOSED',
      'REJECTED',
      'CANCELLED',
    ];

    try {
      const client = this.supabaseService.getClient();
      const { data: assignmentsData, error } = await client
        .from('assignments')
        .select(`
          application_id,
          assigned_at,
          note,
          applications:application_id(
            id,
            ticket_number,
            title,
            current_status,
            current_stage,
            submitted_at,
            services:service_id(id, code, name, type),
            applicants:applicant_id(id, full_name, email, phone, opd_units:opd_unit_id(code, name))
          )
        `)
        .eq('technician_id', technicianId)
        .eq('is_current', true)
        .order('assigned_at', { ascending: false });

      if (!error && assignmentsData) {
        // Fallback jika nested join applications tidak terselesaikan oleh PostgREST relationship cache
        const hasJoinedApps = assignmentsData.some((row: any) => row.applications);
        const appsMap = new Map<string, any>();

        if (!hasJoinedApps && assignmentsData.length > 0) {
          const appIds = [...new Set(assignmentsData.map((r: any) => r.application_id).filter(Boolean))];
          if (appIds.length > 0) {
            const { data: appsData } = await client
              .from('applications')
              .select(`
                id,
                ticket_number,
                title,
                current_status,
                current_stage,
                submitted_at,
                services:service_id(id, code, name, type),
                applicants:applicant_id(id, full_name, email, phone, opd_units:opd_unit_id(code, name))
              `)
              .in('id', appIds);

            if (appsData) {
              for (const a of appsData) {
                appsMap.set(a.id, a);
              }
            }
          }
        }

        let items: TechnicianWorkItem[] = assignmentsData
          .map((row: any) => {
            const rawApp = Array.isArray(row.applications) ? row.applications[0] : row.applications;
            const app = rawApp || appsMap.get(row.application_id);
            if (!app || terminalStatuses.includes(app.current_status)) {
              return null;
            }
            return {
              id: app.id,
              ticket_number: app.ticket_number,
              title: app.title,
              current_status: app.current_status,
              current_stage: app.current_stage,
              submitted_at: app.submitted_at,
              assigned_at: row.assigned_at,
              assignment_note: row.note,
              service: {
                id: app.services?.id,
                code: app.services?.code,
                name: app.services?.name,
                type: app.services?.type,
              },
              applicant: {
                id: app.applicants?.id,
                full_name: app.applicants?.full_name,
                opd_name: app.applicants?.opd_units?.name || 'OPD',
                opd_code: app.applicants?.opd_units?.code || 'OPD',
                email: app.applicants?.email,
                phone: app.applicants?.phone,
              },
            };
          })
          .filter((item): item is TechnicianWorkItem => item !== null);

        if (query.search && query.search.trim()) {
          const q = query.search.trim().toLowerCase();
          items = items.filter(
            (i) =>
              i.ticket_number.toLowerCase().includes(q) ||
              i.title.toLowerCase().includes(q) ||
              i.applicant.opd_name.toLowerCase().includes(q) ||
              i.applicant.full_name.toLowerCase().includes(q),
          );
        }

        if (query.status) {
          items = items.filter((i) => i.current_status === query.status);
        }
        if (query.stage) {
          items = items.filter((i) => i.current_stage === query.stage);
        }

        const total = items.length;
        const startIndex = (page - 1) * pageSize;
        const paginatedItems = items.slice(startIndex, startIndex + pageSize);

        return {
          items: paginatedItems,
          total,
          page,
          page_size: pageSize,
          total_pages: Math.max(1, Math.ceil(total / pageSize)),
        };
      }
    } catch {
      // Fallback
    }

    // In-memory fallback
    const assignedAppIds: { appId: string; assignedAt: string; note: string | null }[] = [];
    for (const [appId, list] of this.inMemoryAssignments.entries()) {
      const current = list.find((a) => a.is_current && a.technician_id === technicianId);
      if (current) {
        assignedAppIds.push({
          appId,
          assignedAt: current.assigned_at,
          note: current.note,
        });
      }
    }

    const mockAdminUser: AuthenticatedUser = {
      id: technicianId,
      email: null,
      role: 'SUPER_ADMIN',
      fullName: 'Tenaga Ahli TI',
    };

    const loadedItems: TechnicianWorkItem[] = [];
    for (const record of assignedAppIds) {
      try {
        const app = await this.adminApplicationsService.getApplicationDetail(record.appId, mockAdminUser);
        if (terminalStatuses.includes(app.current_status)) {
          continue;
        }
        loadedItems.push({
          id: app.id,
          ticket_number: app.ticket_number,
          title: app.title,
          current_status: app.current_status,
          current_stage: app.current_stage,
          submitted_at: app.submitted_at,
          assigned_at: record.assignedAt,
          assignment_note: record.note,
          service: {
            id: app.service.id,
            code: app.service.code,
            name: app.service.name,
            type: app.service.type,
          },
          applicant: {
            id: app.applicant.id,
            full_name: app.applicant.full_name,
            opd_name: app.applicant.opd_name,
            opd_code: app.applicant.opd_code,
            email: app.applicant.email,
            phone: app.applicant.phone,
          },
        });
      } catch {
        // Skip
      }
    }

    let items = loadedItems;
    if (query.search && query.search.trim()) {
      const q = query.search.trim().toLowerCase();
      items = items.filter(
        (i) =>
          i.ticket_number.toLowerCase().includes(q) ||
          i.title.toLowerCase().includes(q) ||
          i.applicant.opd_name.toLowerCase().includes(q),
      );
    }
    if (query.status) {
      items = items.filter((i) => i.current_status === query.status);
    }
    if (query.stage) {
      items = items.filter((i) => i.current_stage === query.stage);
    }

    const total = items.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = items.slice(startIndex, startIndex + pageSize);

    return {
      items: paginatedItems,
      total,
      page,
      page_size: pageSize,
      total_pages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  /**
   * 7. Detail pekerjaan teknisi dengan validasi otorisasi penugasan
   */
  async getTechnicianApplicationDetail(
    applicationId: string,
    user: AuthenticatedUser,
  ) {
    if (user.role === 'TECHNICIAN') {
      const isAssigned = await this.checkTechnicianAuthorization(applicationId, user.id);
      if (!isAssigned) {
        throw new ForbiddenException(
          'Akses ditolak: Anda tidak memiliki wewenang atas permohonan ini karena tidak ditugaskan sebagai tenaga ahli penanggung jawab.',
        );
      }
    }

    return this.adminApplicationsService.getApplicationDetail(applicationId, user);
  }

  /**
   * 8. Eksekusi transisi status oleh teknisi dengan validasi otorisasi
   */
  async executeTechnicianTransition(
    applicationId: string,
    dto: ExecuteTransitionDto,
    user: AuthenticatedUser,
  ) {
    if (user.role === 'TECHNICIAN') {
      const isAssigned = await this.checkTechnicianAuthorization(applicationId, user.id);
      if (!isAssigned) {
        throw new ForbiddenException(
          'Akses ditolak: Anda tidak memiliki wewenang untuk mengubah status permohonan yang tidak ditugaskan kepada Anda.',
        );
      }
    }

    return this.adminApplicationsService.executeTransition(applicationId, dto, user);
  }

  /**
   * 9. Eksekusi pemindahan tahapan lifecycle oleh teknisi dengan validasi otorisasi
   */
  async executeTechnicianStageTransition(
    applicationId: string,
    dto: ExecuteStageTransitionDto,
    user: AuthenticatedUser,
  ) {
    if (user.role === 'TECHNICIAN') {
      const isAssigned = await this.checkTechnicianAuthorization(applicationId, user.id);
      if (!isAssigned) {
        throw new ForbiddenException(
          'Akses ditolak: Anda tidak memiliki wewenang untuk memperbarui tahapan permohonan yang tidak ditugaskan kepada Anda.',
        );
      }
    }

    return this.adminApplicationsService.executeStageTransition(applicationId, dto, user);
  }
}
