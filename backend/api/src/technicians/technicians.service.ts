import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { SupabaseService } from '../supabase/supabase.service.js';
import { AuditService } from '../audit/audit.service.js';
import type {
  CreateTechnicianDto,
  ListTechniciansQueryDto,
  TechnicianAccountItem,
  TechnicianDetailItem,
  UpdateTechnicianDto,
} from './technicians.types.js';

export const DEFAULT_TECHNICIAN_ACCOUNTS: TechnicianAccountItem[] = [
  {
    id: 't1111111-1111-1111-1111-111111111111',
    full_name: 'Ahmad Fauzi, S.Kom',
    email: 'ahmad.fauzi@bandungkab.go.id',
    role: 'TECHNICIAN',
    is_active: true,
    active_assignments_count: 1,
    total_assignments_count: 3,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 't2222222-2222-2222-2222-222222222222',
    full_name: 'Siti Rahmawati, S.Tr.Kom',
    email: 'siti.rahmawati@bandungkab.go.id',
    role: 'TECHNICIAN',
    is_active: true,
    active_assignments_count: 0,
    total_assignments_count: 2,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 't3333333-3333-3333-3333-333333333333',
    full_name: 'Hendra Wijaya, A.Md.Kom',
    email: 'hendra.wijaya@bandungkab.go.id',
    role: 'TECHNICIAN',
    is_active: true,
    active_assignments_count: 0,
    total_assignments_count: 1,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
];

@Injectable()
export class TechniciansService {
  private readonly logger = new Logger(TechniciansService.name);
  private inMemoryTechnicians: TechnicianAccountItem[] = [
    ...DEFAULT_TECHNICIAN_ACCOUNTS,
  ];

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Memeriksa apakah fallback in-memory diizinkan secara eksplisit.
   * Hanya diaktifkan jika berada di lingkungan test dengan flag ALLOW_IN_MEMORY_FALLBACK=true.
   * Tidak pernah diaktifkan pada lingkungan yang terhubung ke Supabase remote.
   */
  private isFallbackAllowed(): boolean {
    return (
      process.env.ALLOW_IN_MEMORY_FALLBACK === 'true' &&
      process.env.NODE_ENV === 'test'
    );
  }

  /**
   * Mengambil daftar teknisi internal beserta status aktif dan beban penugasan.
   * Mengembalikan [] jika database kosong (tanpa menyamarkan dengan data dummy).
   * Melempar InternalServerErrorException jika query database gagal.
   */
  async listTechnicians(query?: ListTechniciansQueryDto): Promise<TechnicianAccountItem[]> {
    const isExplicitFallbackAllowed = this.isFallbackAllowed();

    try {
      const client = this.supabaseService.getClient();
      let dbQuery = client
        .from('profiles')
        .select(`
          id, full_name, role, is_active, email, created_at, updated_at
        `)
        .eq('role', 'TECHNICIAN');

      if (query?.is_active !== undefined) {
        dbQuery = dbQuery.eq('is_active', query.is_active);
      }

      const { data, error } = await dbQuery.order('full_name', { ascending: true });

      if (error) {
        this.logger.error(
          `Gagal memuat profil teknisi dari basis data: ${error.message || JSON.stringify(error)}`,
        );
        if (!isExplicitFallbackAllowed) {
          throw new InternalServerErrorException(
            'Gagal memuat daftar tenaga ahli dari basis data. Silakan coba beberapa saat lagi.',
          );
        }
      } else if (data !== null && data !== undefined) {
        // Query basis data berhasil dieksekusi.
        // Jika data kosong ([]), kembalikan [] sebagai hasil yang valid.
        if (data.length === 0) {
          return [];
        }

        // Ambil data penugasan aktual untuk menghitung beban kerja teknisi
        const { data: assignments, error: assignmentsError } = await client
          .from('assignments')
          .select('technician_id, application_id, is_current');

        if (assignmentsError) {
          this.logger.warn(
            `Gagal memuat data penugasan dari basis data: ${assignmentsError.message || JSON.stringify(assignmentsError)}`,
          );
        }

        const terminalStatuses = ['COMPLETED', 'CLOSED', 'REJECTED', 'CANCELLED'];
        const appStatusMap = new Map<string, string>();

        if (assignments && assignments.length > 0) {
          const appIds = [...new Set(assignments.map((a: any) => a.application_id).filter(Boolean))];
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

        const activeCount = new Map<string, number>();
        const totalCount = new Map<string, number>();

        (assignments || []).forEach((a: any) => {
          totalCount.set(a.technician_id, (totalCount.get(a.technician_id) || 0) + 1);
          const status = a.application_id ? appStatusMap.get(a.application_id) : undefined;
          const isAppActive = appStatusMap.size === 0
            ? true
            : Boolean(status && !terminalStatuses.includes(status));
          if (a.is_current && isAppActive) {
            activeCount.set(a.technician_id, (activeCount.get(a.technician_id) || 0) + 1);
          }
        });

        const items: TechnicianAccountItem[] = data.map((t: any) => ({
          id: t.id,
          full_name: t.full_name,
          email: t.email || `${t.full_name.toLowerCase().replace(/[^a-z]/g, '')}@bandungkab.go.id`,
          role: 'TECHNICIAN',
          is_active: t.is_active,
          active_assignments_count: activeCount.get(t.id) || 0,
          total_assignments_count: totalCount.get(t.id) || 0,
          created_at: t.created_at || new Date().toISOString(),
          updated_at: t.updated_at || new Date().toISOString(),
        }));

        if (query?.search) {
          const s = query.search.toLowerCase();
          return items.filter(
            (i) => i.full_name.toLowerCase().includes(s) || i.email.toLowerCase().includes(s),
          );
        }

        return items;
      }
    } catch (err) {
      if (
        err instanceof InternalServerErrorException ||
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      this.logger.error(
        `Error tak terduga saat memuat daftar teknisi: ${err instanceof Error ? err.message : String(err)}`,
      );
      if (!isExplicitFallbackAllowed) {
        throw new InternalServerErrorException(
          'Gagal memuat daftar tenaga ahli dari basis data. Silakan coba beberapa saat lagi.',
        );
      }
    }

    if (!isExplicitFallbackAllowed) {
      return [];
    }

    // In-memory fallback (hanya diizinkan di lingkungan test dengan ALLOW_IN_MEMORY_FALLBACK=true)
    let result = [...this.inMemoryTechnicians];
    if (query?.is_active !== undefined) {
      result = result.filter((t) => t.is_active === query.is_active);
    }
    if (query?.search) {
      const s = query.search.toLowerCase();
      result = result.filter(
        (t) => t.full_name.toLowerCase().includes(s) || t.email.toLowerCase().includes(s),
      );
    }

    return result.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }

  /**
   * Detail profil teknisi beserta riwayat penugasannya.
   * Menghasilkan NotFoundException/404 jika ID teknisi tidak ditemukan di database.
   * Melempar InternalServerErrorException jika query database gagal.
   */
  async getTechnicianDetail(id: string): Promise<TechnicianDetailItem> {
    const isExplicitFallbackAllowed = this.isFallbackAllowed();

    try {
      const client = this.supabaseService.getClient();
      const { data: profile, error } = await client
        .from('profiles')
        .select('id, full_name, role, is_active, email, created_at, updated_at')
        .eq('id', id)
        .eq('role', 'TECHNICIAN')
        .maybeSingle();

      if (error) {
        this.logger.error(
          `Gagal memuat profil teknisi ${id} dari basis data: ${error.message || JSON.stringify(error)}`,
        );
        if (!isExplicitFallbackAllowed) {
          throw new InternalServerErrorException(
            'Gagal memuat data detail tenaga ahli dari basis data. Silakan coba beberapa saat lagi.',
          );
        }
      } else if (profile) {
        const { data: assignments, error: assignmentsError } = await client
          .from('assignments')
          .select(`
            id, application_id, is_current, assigned_at,
            applications:application_id ( ticket_number, title, current_status )
          `)
          .eq('technician_id', id)
          .order('assigned_at', { ascending: false });

        if (assignmentsError) {
          this.logger.warn(
            `Gagal memuat penugasan untuk teknisi ${id}: ${assignmentsError.message || JSON.stringify(assignmentsError)}`,
          );
        }

        const terminalStatuses = ['COMPLETED', 'CLOSED', 'REJECTED', 'CANCELLED'];
        const mappedAssignments = (assignments || []).map((a: any) => ({
          id: a.id,
          application_id: a.application_id,
          ticket_number: a.applications?.ticket_number || 'SIM-TICKET',
          title: a.applications?.title || 'Permohonan',
          current_status: a.applications?.current_status || null,
          is_current: a.is_current,
          assigned_at: a.assigned_at,
        }));

        const activeCount = mappedAssignments.filter(
          (a) => a.is_current && a.current_status && !terminalStatuses.includes(a.current_status),
        ).length;

        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email || `${profile.full_name.toLowerCase().replace(/[^a-z]/g, '')}@bandungkab.go.id`,
          role: 'TECHNICIAN',
          is_active: profile.is_active,
          active_assignments_count: activeCount,
          total_assignments_count: mappedAssignments.length,
          created_at: profile.created_at || new Date().toISOString(),
          updated_at: profile.updated_at || new Date().toISOString(),
          recent_assignments: mappedAssignments,
        };
      } else {
        // Query berhasil tetapi profil tidak ditemukan di database
        if (!isExplicitFallbackAllowed) {
          throw new NotFoundException(`Profil tenaga ahli dengan ID "${id}" tidak ditemukan.`);
        }
      }
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof InternalServerErrorException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      this.logger.error(
        `Error tak terduga saat memuat detail teknisi: ${err instanceof Error ? err.message : String(err)}`,
      );
      if (!isExplicitFallbackAllowed) {
        throw new InternalServerErrorException(
          'Gagal memuat data detail tenaga ahli dari basis data. Silakan coba beberapa saat lagi.',
        );
      }
    }

    if (!isExplicitFallbackAllowed) {
      throw new NotFoundException(`Profil tenaga ahli dengan ID "${id}" tidak ditemukan.`);
    }

    const found = this.inMemoryTechnicians.find((t) => t.id === id);
    if (!found) {
      throw new NotFoundException(`Profil tenaga ahli dengan ID "${id}" tidak ditemukan.`);
    }

    return {
      ...found,
      recent_assignments: [
        {
          id: 'asgn-mock-01',
          application_id: 'a1000000-0000-0000-0000-000000000001',
          ticket_number: 'SIM-2026-000101',
          title: 'Sistem Informasi Pendapatan Pajak Daerah (SIPPD)',
          is_current: found.active_assignments_count > 0,
          assigned_at: new Date('2026-02-01').toISOString(),
        },
      ],
    };
  }

  /**
   * [SUPER_ADMIN] Mendaftarkan teknisi baru (Integrasi aman Supabase Auth)
   * TIDAK PERNAH mengekspos password atau kredensial rahasia pada respon.
   */
  async createTechnician(
    dto: CreateTechnicianDto,
    actorId?: string,
  ): Promise<TechnicianAccountItem> {
    const fullName = dto.full_name.trim();
    const email = dto.email.trim().toLowerCase();

    if (!fullName) {
      throw new BadRequestException('Nama lengkap tenaga ahli wajib diisi.');
    }
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Alamat email valid wajib diisi.');
    }

    // Periksa keunikan email
    const duplicate = this.inMemoryTechnicians.find((t) => t.email.toLowerCase() === email);
    if (duplicate) {
      throw new ConflictException(`Alamat email "${email}" telah terdaftar pada sistem.`);
    }

    let userId: string = crypto.randomUUID();
    const now = new Date().toISOString();
    const password = dto.password || `SimantikPass#${Math.random().toString(36).slice(-8)}`;

    try {
      const client = this.supabaseService.getClient();

      // Coba buat pengguna di Supabase Auth via admin API
      const { data: authUser, error: authError } = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: 'TECHNICIAN',
        },
      });

      if (!authError && authUser?.user?.id) {
        userId = authUser.user.id;
      }

      // Masukkan profil ke tabel profiles
      await client.from('profiles').upsert({
        id: userId,
        full_name: fullName,
        email,
        role: 'TECHNICIAN',
        is_active: dto.is_active !== undefined ? dto.is_active : true,
      });
    } catch {
      // Fallback
    }

    const newTechnician: TechnicianAccountItem = {
      id: userId,
      full_name: fullName,
      email,
      role: 'TECHNICIAN',
      is_active: dto.is_active !== undefined ? dto.is_active : true,
      active_assignments_count: 0,
      total_assignments_count: 0,
      created_at: now,
      updated_at: now,
    };

    this.inMemoryTechnicians.push(newTechnician);

    // Audit log (tanpa password)
    await this.auditService.record({
      actor_profile_id: actorId,
      action: 'TECHNICIAN_ACCOUNT_CREATED',
      entity_type: 'profiles',
      entity_id: userId,
      new_data: { full_name: fullName, email, role: 'TECHNICIAN', is_active: newTechnician.is_active },
    });

    return newTechnician;
  }

  /**
   * [SUPER_ADMIN] Memperbarui profil teknisi
   */
  async updateTechnician(
    id: string,
    dto: UpdateTechnicianDto,
    actorId?: string,
  ): Promise<TechnicianAccountItem> {
    const technician = await this.getTechnicianDetail(id);
    const oldData = { ...technician };

    if (dto.full_name) {
      technician.full_name = dto.full_name.trim();
    }

    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      const duplicate = this.inMemoryTechnicians.find(
        (t) => t.email.toLowerCase() === email && t.id !== id,
      );
      if (duplicate) {
        throw new ConflictException(`Email "${email}" telah digunakan oleh akun lain.`);
      }
      technician.email = email;
    }

    if (dto.is_active !== undefined) {
      technician.is_active = dto.is_active;
    }

    technician.updated_at = new Date().toISOString();

    try {
      const client = this.supabaseService.getClient();

      if (dto.password) {
        await client.auth.admin.updateUserById(id, { password: dto.password });
      }
      if (dto.email) {
        await client.auth.admin.updateUserById(id, { email: technician.email });
      }

      await client
        .from('profiles')
        .update({
          full_name: technician.full_name,
          email: technician.email,
          is_active: technician.is_active,
          updated_at: technician.updated_at,
        })
        .eq('id', id);
    } catch {
      // Fallback
    }

    // Update in-memory
    const inMemIdx = this.inMemoryTechnicians.findIndex((t) => t.id === id);
    if (inMemIdx !== -1) {
      this.inMemoryTechnicians[inMemIdx] = {
        ...this.inMemoryTechnicians[inMemIdx],
        full_name: technician.full_name,
        email: technician.email,
        is_active: technician.is_active,
        updated_at: technician.updated_at,
      };
    }

    // Audit log
    await this.auditService.record({
      actor_profile_id: actorId,
      action: 'TECHNICIAN_ACCOUNT_UPDATED',
      entity_type: 'profiles',
      entity_id: id,
      old_data: { full_name: oldData.full_name, email: oldData.email, is_active: oldData.is_active },
      new_data: { full_name: technician.full_name, email: technician.email, is_active: technician.is_active },
    });

    return technician;
  }

  /**
   * [SUPER_ADMIN] Mengaktifkan atau menonaktifkan akun teknisi
   * PENTING: Tidak menghapus data historis (riwayat penugasan, log audit, catatan teknis tetap aman).
   */
  async toggleTechnicianStatus(
    id: string,
    isActive: boolean,
    actorId?: string,
  ): Promise<TechnicianAccountItem> {
    const technician = await this.getTechnicianDetail(id);
    const oldStatus = technician.is_active;
    technician.is_active = isActive;
    technician.updated_at = new Date().toISOString();

    try {
      const client = this.supabaseService.getClient();
      await client
        .from('profiles')
        .update({
          is_active: isActive,
          updated_at: technician.updated_at,
        })
        .eq('id', id);

      if (!isActive) {
        // Blokir sesi Supabase Auth tanpa menghapus pengguna
        await client.auth.admin.updateUserById(id, {
          user_metadata: { is_active: false },
          ban_duration: '876000h', // Ban 100 tahun (soft deactivation)
        });
      } else {
        // Cabut larangan
        await client.auth.admin.updateUserById(id, {
          user_metadata: { is_active: true },
          ban_duration: 'none',
        });
      }
    } catch {
      // Fallback
    }

    // Update in-memory
    const inMemIdx = this.inMemoryTechnicians.findIndex((t) => t.id === id);
    if (inMemIdx !== -1) {
      this.inMemoryTechnicians[inMemIdx].is_active = isActive;
      this.inMemoryTechnicians[inMemIdx].updated_at = technician.updated_at;
    }

    // Audit log
    await this.auditService.record({
      actor_profile_id: actorId,
      action: isActive ? 'TECHNICIAN_ACTIVATED' : 'TECHNICIAN_DEACTIVATED',
      entity_type: 'profiles',
      entity_id: id,
      old_data: { is_active: oldStatus },
      new_data: { is_active: isActive, historical_records_preserved: true },
    });

    return technician;
  }
}
