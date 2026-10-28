import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { SupabaseService } from '../supabase/supabase.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  assertSupabaseOk,
  isInMemoryFallbackAllowed,
} from '../common/utils/supabase.utils.js';
import type {
  CreateRequirementDto,
  CreateServiceDto,
  ServiceEntity,
  ServiceRequirementEntity,
  UpdateRequirementDto,
  UpdateServiceDto,
} from './services.types.js';

// Default standard catalog fallback
const DEFAULT_SERVICES: ServiceEntity[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    code: 'SRV-DEV',
    slug: 'pembangunan-aplikasi',
    name: 'Pembangunan Aplikasi Baru',
    type: 'DEVELOPMENT',
    description:
      'Layanan perancangan dan pembangunan sistem informasi baru dari tahap awal untuk mendukung operasional atau inovasi OPD yang belum terakomodasi dalam sistem eksisting.',
    is_active: true,
    sort_order: 1,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
    requirements: [
      {
        id: 'a1111111-1111-1111-1111-111111111111',
        service_id: '11111111-1111-1111-1111-111111111111',
        name: 'Surat Permohonan Resmi OPD',
        description:
          'Surat dinas resmi berkop OPD dan ditandatangani oleh Kepala Perangkat Daerah / minimal Pejabat Eselon II (Format PDF, maks. 5 MB).',
        type: 'DOCUMENT',
        is_required: true,
        sort_order: 1,
        is_active: true,
        allowed_file_types: 'application/pdf',
        max_file_size_mb: 5,
        is_placeholder: false,
        created_at: new Date('2026-01-01').toISOString(),
        updated_at: new Date('2026-01-01').toISOString(),
      },
      {
        id: 'a2222222-2222-2222-2222-222222222222',
        service_id: '11111111-1111-1111-1111-111111111111',
        name: 'Kerangka Acuan Kerja (KAK)',
        description:
          'Dokumen memuat latar belakang, maksud dan tujuan, ruang lingkup proses bisnis, output, dan jadwal tentatif (Format PDF, maks. 10 MB).',
        type: 'DOCUMENT',
        is_required: true,
        sort_order: 2,
        is_active: true,
        allowed_file_types: 'application/pdf',
        max_file_size_mb: 10,
        is_placeholder: false,
        created_at: new Date('2026-01-01').toISOString(),
        updated_at: new Date('2026-01-01').toISOString(),
      },
      {
        id: 'a3333333-3333-3333-3333-333333333333',
        service_id: '11111111-1111-1111-1111-111111111111',
        name: 'Identitas Narahubung / PIC Teknis',
        description:
          'Nama, NIP, Jabatan, Nomor WhatsApp, dan Email pejabat/staf teknis yang ditugaskan sebagai kontak utama dari OPD.',
        type: 'DATA',
        is_required: true,
        sort_order: 3,
        is_active: true,
        allowed_file_types: null,
        max_file_size_mb: null,
        is_placeholder: false,
        created_at: new Date('2026-01-01').toISOString(),
        updated_at: new Date('2026-01-01').toISOString(),
      },
      {
        id: 'a4444444-4444-4444-4444-444444444444',
        service_id: '11111111-1111-1111-1111-111111111111',
        name: 'Bagan Alur Bisnis / SOP Pelayanan',
        description:
          'Diagram atau uraian alur operasional proses pelayanan yang akan didigitalkan ke dalam sistem (Opsional namun disarankan).',
        type: 'DOCUMENT',
        is_required: false,
        sort_order: 4,
        is_active: true,
        allowed_file_types: 'application/pdf,image/png,image/jpeg',
        max_file_size_mb: 10,
        is_placeholder: false,
        created_at: new Date('2026-01-01').toISOString(),
        updated_at: new Date('2026-01-01').toISOString(),
      },
      {
        id: 'a5555555-5555-5555-5555-555555555555',
        service_id: '11111111-1111-1111-1111-111111111111',
        name: 'Konfirmasi Komitmen Penyelenggaraan SPBE',
        description:
          'Pernyataan kesiapan dan komitmen perangkat daerah dalam penyediaan data, integrasi, dan pengujian sistem bersama Diskominfo.',
        type: 'CONFIRMATION',
        is_required: true,
        sort_order: 5,
        is_active: true,
        allowed_file_types: null,
        max_file_size_mb: null,
        is_placeholder: false,
        created_at: new Date('2026-01-01').toISOString(),
        updated_at: new Date('2026-01-01').toISOString(),
      },
    ],
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    code: 'SRV-ENH',
    slug: 'pengembangan-aplikasi',
    name: 'Pengembangan Aplikasi Eksisting',
    type: 'ENHANCEMENT',
    description:
      'Layanan penambahan modul, perubahan alur proses bisnis, integrasi interoperabilitas API, atau penyesuaian regulasi baru pada aplikasi yang telah aktif beroperasi.',
    is_active: true,
    sort_order: 2,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
    requirements: [
      {
        id: 'b1111111-1111-1111-1111-111111111111',
        service_id: '22222222-2222-2222-2222-222222222222',
        name: 'Surat Permohonan Perubahan / Pengembangan',
        description:
          'Surat dinas resmi dari pimpinan OPD pemohon yang menguraikan dasar permohonan pengembangan (Format PDF, maks. 5 MB).',
        type: 'DOCUMENT',
        is_required: true,
        sort_order: 1,
        is_active: true,
        allowed_file_types: 'application/pdf',
        max_file_size_mb: 5,
        is_placeholder: false,
        created_at: new Date('2026-01-01').toISOString(),
        updated_at: new Date('2026-01-01').toISOString(),
      },
      {
        id: 'b2222222-2222-2222-2222-222222222222',
        service_id: '22222222-2222-2222-2222-222222222222',
        name: 'Dokumen Kebutuhan Fitur (Change Request)',
        description:
          'Daftar rincian menu, field, formulir, atau laporan yang diminta untuk ditambahkan atau disesuaikan (Format PDF/Excel, maks. 10 MB).',
        type: 'DOCUMENT',
        is_required: true,
        sort_order: 2,
        is_active: true,
        allowed_file_types: 'application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        max_file_size_mb: 10,
        is_placeholder: false,
        created_at: new Date('2026-01-01').toISOString(),
        updated_at: new Date('2026-01-01').toISOString(),
      },
      {
        id: 'b3333333-3333-3333-3333-333333333333',
        service_id: '22222222-2222-2222-2222-222222222222',
        name: 'Informasi Sistem Eksisting',
        description:
          'Nama aplikasi, URL/domain aktif, dan informasi pengguna/basis data terkait.',
        type: 'DATA',
        is_required: true,
        sort_order: 3,
        is_active: true,
        allowed_file_types: null,
        max_file_size_mb: null,
        is_placeholder: false,
        created_at: new Date('2026-01-01').toISOString(),
        updated_at: new Date('2026-01-01').toISOString(),
      },
      {
        id: 'b4444444-4444-4444-4444-444444444444',
        service_id: '22222222-2222-2222-2222-222222222222',
        name: 'PIC Pengelola Aplikasi Eksisting',
        description:
          'Kontak narahubung teknis yang menguasai operasional harian aplikasi eksisting.',
        type: 'DATA',
        is_required: true,
        sort_order: 4,
        is_active: true,
        allowed_file_types: null,
        max_file_size_mb: null,
        is_placeholder: false,
        created_at: new Date('2026-01-01').toISOString(),
        updated_at: new Date('2026-01-01').toISOString(),
      },
      {
        id: 'b5555555-5555-5555-5555-555555555555',
        service_id: '22222222-2222-2222-2222-222222222222',
        name: 'Dokumentasi / Berita Acara Rilis Sebelumnya',
        description:
          'Salinan berita acara serah terima atau dokumen teknis rilis sebelumnya jika tersedia (Opsional).',
        type: 'DOCUMENT',
        is_required: false,
        sort_order: 5,
        is_active: true,
        allowed_file_types: 'application/pdf',
        max_file_size_mb: 10,
        is_placeholder: false,
        created_at: new Date('2026-01-01').toISOString(),
        updated_at: new Date('2026-01-01').toISOString(),
      },
    ],
  },
];

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);
  // In-memory catalog state for consistent testing & graceful fallback
  private inMemoryServices: ServiceEntity[] = JSON.parse(
    JSON.stringify(DEFAULT_SERVICES),
  );

  constructor(
    private readonly supabaseService: SupabaseService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  /**
   * Mengambil daftar layanan publik yang aktif beserta persyaratannya.
   */
  async getPublicServices(): Promise<ServiceEntity[]> {
    try {
      const client = this.supabaseService.getClient();
      const { data: services, error } = await client
        .from('services')
        .select(`
          id, code, slug, name, type, description, is_active, sort_order, created_at, updated_at,
          service_requirements (
            id, service_id, name, description, type, is_required, sort_order, is_active,
            allowed_file_types, max_file_size_mb, created_at, updated_at
          )
        `)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        this.logger.error(`Gagal memuat layanan publik: ${error.message}`);
        if (!isInMemoryFallbackAllowed()) {
          throw new InternalServerErrorException('Gagal memuat daftar layanan dari basis data.');
        }
      } else if (services !== null && services !== undefined) {
        return services.map((s: Record<string, unknown>) => ({
          ...s,
          requirements: (
            ((s.service_requirements as ServiceRequirementEntity[]) || []).filter(
              (r) => r.is_active !== false,
            )
          ).sort((a, b) => a.sort_order - b.sort_order),
        })) as ServiceEntity[];
      }
    } catch (err) {
      if (err instanceof InternalServerErrorException) throw err;
      this.logger.error(`Error getPublicServices: ${err instanceof Error ? err.message : String(err)}`);
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal memuat daftar layanan dari basis data.');
      }
    }

    if (!isInMemoryFallbackAllowed()) {
      return [];
    }

    return this.inMemoryServices
      .filter((s) => s.is_active)
      .map((s) => ({
        ...s,
        requirements: (s.requirements || []).filter((r) => r.is_active !== false),
      }))
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  /**
   * Mengambil detail satu layanan publik berdasarkan slug atau ID.
   */
  async getPublicServiceBySlugOrId(slugOrId: string): Promise<ServiceEntity> {
    try {
      const client = this.supabaseService.getClient();
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          slugOrId,
        );

      let query = client
        .from('services')
        .select(`
          id, code, slug, name, type, description, is_active, sort_order, created_at, updated_at,
          service_requirements (
            id, service_id, name, description, type, is_required, sort_order, is_active,
            allowed_file_types, max_file_size_mb, created_at, updated_at
          )
        `)
        .eq('is_active', true);

      query = isUuid ? query.eq('id', slugOrId) : query.eq('slug', slugOrId);

      const { data, error } = await query.maybeSingle();

      if (error) {
        this.logger.error(`Gagal memuat layanan ${slugOrId}: ${error.message}`);
        if (!isInMemoryFallbackAllowed()) {
          throw new InternalServerErrorException('Gagal memuat detail layanan dari basis data.');
        }
      } else if (data) {
        return {
          ...data,
          requirements: (
            ((data.service_requirements as ServiceRequirementEntity[]) || []).filter(
              (r) => r.is_active !== false,
            )
          ).sort((a, b) => a.sort_order - b.sort_order),
        } as ServiceEntity;
      } else {
        if (!isInMemoryFallbackAllowed()) {
          throw new NotFoundException(
            `Layanan dengan pengenal "${slugOrId}" tidak ditemukan atau tidak aktif.`,
          );
        }
      }
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof InternalServerErrorException
      ) {
        throw err;
      }
      this.logger.error(`Error getPublicServiceBySlugOrId: ${err instanceof Error ? err.message : String(err)}`);
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal memuat detail layanan dari basis data.');
      }
    }

    const found = this.inMemoryServices.find(
      (s) => (s.slug === slugOrId || s.id === slugOrId) && s.is_active,
    );
    if (!found) {
      throw new NotFoundException(
        `Layanan dengan pengenal "${slugOrId}" tidak ditemukan atau tidak aktif.`,
      );
    }
    return {
      ...found,
      requirements: (found.requirements || []).filter((r) => r.is_active !== false),
    };
  }

  /**
   * Mengambil persyaratan dari satu layanan publik.
   */
  async getPublicRequirements(
    slugOrId: string,
  ): Promise<ServiceRequirementEntity[]> {
    const service = await this.getPublicServiceBySlugOrId(slugOrId);
    return service.requirements || [];
  }

  /**
   * [ADMIN] Mengambil seluruh layanan (termasuk non-aktif).
   */
  async getAdminServices(): Promise<ServiceEntity[]> {
    try {
      const client = this.supabaseService.getClient();
      const { data: services, error } = await client
        .from('services')
        .select(`
          id, code, slug, name, type, description, is_active, sort_order, created_at, updated_at,
          service_requirements (
            id, service_id, name, description, type, is_required, sort_order, is_active,
            allowed_file_types, max_file_size_mb, created_at, updated_at
          )
        `)
        .order('sort_order', { ascending: true });

      if (error) {
        this.logger.error(`Gagal memuat katalog layanan admin: ${error.message}`);
        if (!isInMemoryFallbackAllowed()) {
          throw new InternalServerErrorException('Gagal memuat katalog layanan dari basis data.');
        }
      } else if (services !== null && services !== undefined) {
        return services.map((s: Record<string, unknown>) => ({
          ...s,
          requirements: ((s.service_requirements as ServiceRequirementEntity[]) || []).sort(
            (a, b) => a.sort_order - b.sort_order,
          ),
        })) as ServiceEntity[];
      }
    } catch (err) {
      if (err instanceof InternalServerErrorException) throw err;
      this.logger.error(`Error getAdminServices: ${err instanceof Error ? err.message : String(err)}`);
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal memuat katalog layanan dari basis data.');
      }
    }

    if (!isInMemoryFallbackAllowed()) {
      return [];
    }

    return this.inMemoryServices.sort((a, b) => a.sort_order - b.sort_order);
  }

  /**
   * [ADMIN] Mengambil detail layanan lengkap berdasarkan ID.
   */
  async getAdminServiceDetail(id: string): Promise<ServiceEntity> {
    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('services')
        .select(`
          id, code, slug, name, type, description, is_active, sort_order, created_at, updated_at,
          service_requirements (
            id, service_id, name, description, type, is_required, sort_order, is_active,
            allowed_file_types, max_file_size_mb, created_at, updated_at
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        this.logger.error(`Gagal memuat detail layanan admin ${id}: ${error.message}`);
        if (!isInMemoryFallbackAllowed()) {
          throw new InternalServerErrorException('Gagal memuat detail layanan dari basis data.');
        }
      } else if (data) {
        return {
          ...data,
          requirements: (
            (data.service_requirements as ServiceRequirementEntity[]) || []
          ).sort((a, b) => a.sort_order - b.sort_order),
        } as ServiceEntity;
      } else {
        if (!isInMemoryFallbackAllowed()) {
          throw new NotFoundException(`Layanan ID "${id}" tidak ditemukan.`);
        }
      }
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof InternalServerErrorException
      ) {
        throw err;
      }
      this.logger.error(`Error getAdminServiceDetail: ${err instanceof Error ? err.message : String(err)}`);
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal memuat detail layanan dari basis data.');
      }
    }

    const found = this.inMemoryServices.find((s) => s.id === id);
    if (!found) {
      throw new NotFoundException(`Layanan ID "${id}" tidak ditemukan.`);
    }
    return found;
  }

  /**
   * [SUPER_ADMIN] Membuat layanan baru di katalog
   */
  async createService(dto: CreateServiceDto, actorId?: string): Promise<ServiceEntity> {
    const code = dto.code.trim().toUpperCase();
    const name = dto.name.trim();
    const slug = dto.slug ? dto.slug.trim().toLowerCase() : name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const existingCode = this.inMemoryServices.find((s) => s.code === code);
    if (existingCode) {
      throw new ConflictException(`Kode layanan "${code}" telah digunakan.`);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newService: ServiceEntity = {
      id,
      code,
      slug,
      name,
      type: dto.type,
      description: dto.description || null,
      is_active: dto.is_active !== undefined ? dto.is_active : true,
      sort_order: dto.sort_order || this.inMemoryServices.length + 1,
      created_at: now,
      updated_at: now,
      requirements: [],
    };

    try {
      const client = this.supabaseService.getClient();
      const insertRes = await client
        .from('services')
        .insert({
          id,
          code,
          slug,
          name,
          type: dto.type,
          description: dto.description || null,
          is_active: newService.is_active,
          sort_order: newService.sort_order,
        })
        .select()
        .single();

      if (insertRes.error) {
        if (!isInMemoryFallbackAllowed()) {
          assertSupabaseOk(insertRes, 'Menyimpan layanan baru');
        } else {
          this.logger.warn(`Supabase error pada createService, fallback in-memory: ${insertRes.error.message}`);
        }
      } else if (insertRes.data) {
        newService.created_at = insertRes.data.created_at;
        newService.updated_at = insertRes.data.updated_at;
      }
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof ConflictException ||
        err instanceof InternalServerErrorException
      ) {
        throw err;
      }
      this.logger.error(`Gagal membuat layanan: ${err instanceof Error ? err.message : String(err)}`);
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal menyimpan layanan ke basis data.');
      }
    }

    if (isInMemoryFallbackAllowed()) {
      this.inMemoryServices.push(newService);
    }

    if (this.auditService) {
      await this.auditService.record({
        actor_profile_id: actorId,
        action: 'SERVICE_CREATED',
        entity_type: 'services',
        entity_id: id,
        new_data: { code, name, type: dto.type, is_active: newService.is_active },
      });
    }

    return newService;
  }

  /**
   * [ADMIN] Mengubah metadata layanan.
   */
  async updateService(
    id: string,
    dto: UpdateServiceDto,
    actorId?: string,
  ): Promise<ServiceEntity> {
    const oldService = await this.getAdminServiceDetail(id);

    try {
      const client = this.supabaseService.getClient();
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (dto.name !== undefined) payload.name = dto.name;
      if (dto.description !== undefined) payload.description = dto.description;
      if (dto.is_active !== undefined) payload.is_active = dto.is_active;
      if (dto.sort_order !== undefined) payload.sort_order = dto.sort_order;

      const updateRes = await client
        .from('services')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (updateRes.error) {
        if (!isInMemoryFallbackAllowed()) {
          assertSupabaseOk(updateRes, 'Memperbarui data layanan');
        } else {
          this.logger.warn(`Supabase error pada updateService, fallback in-memory: ${updateRes.error.message}`);
        }
      } else if (updateRes.data) {
        if (this.auditService) {
          await this.auditService.record({
            actor_profile_id: actorId,
            action: 'SERVICE_UPDATED',
            entity_type: 'services',
            entity_id: id,
            old_data: { name: oldService.name, is_active: oldService.is_active },
            new_data: payload,
          });
        }
        return this.getAdminServiceDetail(id);
      }
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof ConflictException ||
        err instanceof InternalServerErrorException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      this.logger.error(`Gagal memperbarui layanan ${id}: ${err instanceof Error ? err.message : String(err)}`);
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal memperbarui layanan di basis data.');
      }
    }

    const service = this.inMemoryServices.find((s) => s.id === id);
    if (!service) {
      throw new NotFoundException(`Layanan ID "${id}" tidak ditemukan.`);
    }

    if (dto.name !== undefined) service.name = dto.name;
    if (dto.description !== undefined) service.description = dto.description;
    if (dto.is_active !== undefined) service.is_active = dto.is_active;
    if (dto.sort_order !== undefined) service.sort_order = dto.sort_order;
    service.updated_at = new Date().toISOString();

    if (this.auditService) {
      await this.auditService.record({
        actor_profile_id: actorId,
        action: 'SERVICE_UPDATED',
        entity_type: 'services',
        entity_id: id,
        old_data: { name: oldService.name, is_active: oldService.is_active },
        new_data: { name: service.name, is_active: service.is_active },
      });
    }

    return service;
  }

  /**
   * [ADMIN] Menambahkan persyaratan baru pada layanan.
   */
  async createRequirement(
    serviceId: string,
    dto: CreateRequirementDto,
    actorId?: string,
  ): Promise<ServiceRequirementEntity> {
    const service = await this.getAdminServiceDetail(serviceId);

    const newReqId = crypto.randomUUID();
    const newRequirement: ServiceRequirementEntity = {
      id: newReqId,
      service_id: service.id,
      name: dto.name,
      description: dto.description ?? null,
      type: dto.type,
      is_required: dto.is_required ?? true,
      sort_order: dto.sort_order ?? (service.requirements?.length || 0) + 1,
      is_active: dto.is_active !== undefined ? dto.is_active : true,
      allowed_file_types: dto.allowed_file_types || 'application/pdf,image/png,image/jpeg',
      max_file_size_mb: dto.max_file_size_mb || 10,
      is_placeholder: dto.is_placeholder ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const client = this.supabaseService.getClient();
      const insertRes = await client
        .from('service_requirements')
        .insert({
          id: newReqId,
          service_id: service.id,
          name: dto.name,
          description: dto.description ?? null,
          type: dto.type,
          is_required: dto.is_required ?? true,
          sort_order: newRequirement.sort_order,
          is_active: newRequirement.is_active,
          allowed_file_types: newRequirement.allowed_file_types,
          max_file_size_mb: newRequirement.max_file_size_mb,
        })
        .select()
        .single();

      if (insertRes.error) {
        if (!isInMemoryFallbackAllowed()) {
          assertSupabaseOk(insertRes, 'Menyimpan persyaratan layanan baru');
        } else {
          this.logger.warn(`Supabase error pada createRequirement, fallback in-memory: ${insertRes.error.message}`);
        }
      } else if (insertRes.data) {
        if (this.auditService) {
          await this.auditService.record({
            actor_profile_id: actorId,
            action: 'REQUIREMENT_CREATED',
            entity_type: 'service_requirements',
            entity_id: newReqId,
            new_data: { service_id: service.id, name: dto.name, is_required: newRequirement.is_required },
          });
        }
        return insertRes.data as ServiceRequirementEntity;
      }
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof ConflictException ||
        err instanceof InternalServerErrorException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      this.logger.error(`Gagal membuat persyaratan layanan: ${err instanceof Error ? err.message : String(err)}`);
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal menyimpan persyaratan ke basis data.');
      }
    }

    if (isInMemoryFallbackAllowed()) {
      if (!service.requirements) service.requirements = [];
      service.requirements.push(newRequirement);
    }

    if (this.auditService) {
      await this.auditService.record({
        actor_profile_id: actorId,
        action: 'REQUIREMENT_CREATED',
        entity_type: 'service_requirements',
        entity_id: newReqId,
        new_data: { service_id: service.id, name: dto.name, is_required: newRequirement.is_required },
      });
    }

    return newRequirement;
  }

  /**
   * [ADMIN] Mengubah persyaratan layanan.
   */
  async updateRequirement(
    serviceId: string,
    reqId: string,
    dto: UpdateRequirementDto,
    actorId?: string,
  ): Promise<ServiceRequirementEntity> {
    const service = await this.getAdminServiceDetail(serviceId);
    const existingReq = (service.requirements || []).find((r) => r.id === reqId);
    if (!existingReq) {
      throw new NotFoundException(
        `Persyaratan dengan ID "${reqId}" tidak ditemukan pada layanan ini.`,
      );
    }

    const oldData = { ...existingReq };

    try {
      const client = this.supabaseService.getClient();
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (dto.name !== undefined) payload.name = dto.name;
      if (dto.description !== undefined) payload.description = dto.description;
      if (dto.type !== undefined) payload.type = dto.type;
      if (dto.is_required !== undefined) payload.is_required = dto.is_required;
      if (dto.sort_order !== undefined) payload.sort_order = dto.sort_order;
      if (dto.is_active !== undefined) payload.is_active = dto.is_active;
      if (dto.allowed_file_types !== undefined) payload.allowed_file_types = dto.allowed_file_types;
      if (dto.max_file_size_mb !== undefined) payload.max_file_size_mb = dto.max_file_size_mb;

      const updateRes = await client
        .from('service_requirements')
        .update(payload)
        .eq('id', reqId)
        .select()
        .single();

      if (updateRes.error) {
        if (!isInMemoryFallbackAllowed()) {
          assertSupabaseOk(updateRes, 'Memperbarui persyaratan layanan');
        } else {
          this.logger.warn(`Supabase error pada updateRequirement, fallback in-memory: ${updateRes.error.message}`);
        }
      } else if (updateRes.data) {
        if (this.auditService) {
          await this.auditService.record({
            actor_profile_id: actorId,
            action: 'REQUIREMENT_UPDATED',
            entity_type: 'service_requirements',
            entity_id: reqId,
            old_data: oldData as any,
            new_data: payload,
          });
        }
        return updateRes.data as ServiceRequirementEntity;
      }
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof ConflictException ||
        err instanceof InternalServerErrorException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      this.logger.error(`Gagal memperbarui persyaratan ${reqId}: ${err instanceof Error ? err.message : String(err)}`);
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal memperbarui persyaratan di basis data.');
      }
    }

    if (dto.name !== undefined) existingReq.name = dto.name;
    if (dto.description !== undefined) existingReq.description = dto.description;
    if (dto.type !== undefined) existingReq.type = dto.type;
    if (dto.is_required !== undefined) existingReq.is_required = dto.is_required;
    if (dto.sort_order !== undefined) existingReq.sort_order = dto.sort_order;
    if (dto.is_active !== undefined) existingReq.is_active = dto.is_active;
    if (dto.allowed_file_types !== undefined) existingReq.allowed_file_types = dto.allowed_file_types;
    if (dto.max_file_size_mb !== undefined) existingReq.max_file_size_mb = dto.max_file_size_mb;
    if (dto.is_placeholder !== undefined) existingReq.is_placeholder = dto.is_placeholder;
    existingReq.updated_at = new Date().toISOString();

    if (this.auditService) {
      await this.auditService.record({
        actor_profile_id: actorId,
        action: 'REQUIREMENT_UPDATED',
        entity_type: 'service_requirements',
        entity_id: reqId,
        old_data: oldData as any,
        new_data: { name: existingReq.name, is_required: existingReq.is_required },
      });
    }

    return existingReq;
  }

  /**
   * [ADMIN] Menghapus atau menonaktifkan persyaratan layanan.
   * Melindungi integritas data historis: jika ada permohonan yang merujuk, persyaratan dinonaktifkan.
   */
  async deleteRequirement(
    serviceId: string,
    reqId: string,
    actorId?: string,
  ): Promise<{ success: boolean; id: string; deactivated?: boolean }> {
    const service = await this.getAdminServiceDetail(serviceId);
    const index = (service.requirements || []).findIndex((r) => r.id === reqId);
    if (index === -1) {
      throw new NotFoundException(
        `Persyaratan dengan ID "${reqId}" tidak ditemukan pada layanan ini.`,
      );
    }

    try {
      const client = this.supabaseService.getClient();
      // Periksa apakah sudah ada berkas permohonan yang merujuk persyaratan ini
      const { data: refDocs } = await client
        .from('application_documents')
        .select('id')
        .eq('requirement_id', reqId)
        .limit(1);

      if (refDocs && refDocs.length > 0) {
        // Soft-deactivate untuk melindungi integritas referensial data pengajuan sebelumnya
        const updateRes = await client
          .from('service_requirements')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', reqId);

        if (updateRes.error) {
          if (!isInMemoryFallbackAllowed()) {
            assertSupabaseOk(updateRes, 'Menonaktifkan persyaratan layanan');
          } else {
            this.logger.warn(`Supabase error pada deactive requirement, fallback in-memory: ${updateRes.error.message}`);
          }
        }

        if (isInMemoryFallbackAllowed()) {
          service.requirements![index].is_active = false;
        }

        if (this.auditService) {
          await this.auditService.record({
            actor_profile_id: actorId,
            action: 'REQUIREMENT_DEACTIVATED',
            entity_type: 'service_requirements',
            entity_id: reqId,
            new_data: { is_active: false, reason: 'Preserved due to existing application references' },
          });
        }

        return { success: true, id: reqId, deactivated: true };
      }

      const delRes = await client.from('service_requirements').delete().eq('id', reqId);
      if (delRes.error) {
        if (!isInMemoryFallbackAllowed()) {
          assertSupabaseOk(delRes, 'Menghapus persyaratan layanan');
        } else {
          this.logger.warn(`Supabase error pada delete requirement, fallback in-memory: ${delRes.error.message}`);
        }
      }
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof ConflictException ||
        err instanceof InternalServerErrorException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      this.logger.error(`Gagal menghapus persyaratan ${reqId}: ${err instanceof Error ? err.message : String(err)}`);
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal menghapus persyaratan dari basis data.');
      }
    }

    if (isInMemoryFallbackAllowed()) {
      service.requirements?.splice(index, 1);
    }

    if (this.auditService) {
      await this.auditService.record({
        actor_profile_id: actorId,
        action: 'REQUIREMENT_DELETED',
        entity_type: 'service_requirements',
        entity_id: reqId,
      });
    }

    return { success: true, id: reqId };
  }
}
