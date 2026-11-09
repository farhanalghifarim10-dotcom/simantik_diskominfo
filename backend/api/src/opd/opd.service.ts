import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { SupabaseService } from '../supabase/supabase.service.js';
import { AuditService } from '../audit/audit.service.js';
import type {
  CreateOpdDto,
  ListOpdQueryDto,
  OpdUnitItem,
  UpdateOpdDto,
} from './opd.types.js';

export const DEFAULT_OPD_UNITS: OpdUnitItem[] = [
  {
    id: 'c1111111-1111-1111-1111-111111111111',
    code: 'DISKOMINFO',
    name: 'Dinas Komunikasi dan Informatika',
    is_active: true,
    application_count: 5,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'c2222222-2222-2222-2222-222222222222',
    code: 'BAPENDA',
    name: 'Badan Pendapatan Daerah',
    is_active: true,
    application_count: 3,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    code: 'BKPSDM',
    name: 'Badan Kepegawaian dan Pengembangan Sumber Daya Manusia',
    is_active: true,
    application_count: 2,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'c4444444-4444-4444-4444-444444444444',
    code: 'DINKES',
    name: 'Dinas Kesehatan',
    is_active: true,
    application_count: 4,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'c5555555-5555-5555-5555-555555555555',
    code: 'DISDIK',
    name: 'Dinas Pendidikan',
    is_active: true,
    application_count: 1,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'c6666666-6666-6666-6666-666666666666',
    code: 'DINSOS',
    name: 'Dinas Sosial',
    is_active: true,
    application_count: 0,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'c7777777-7777-7777-7777-777777777777',
    code: 'SETDA',
    name: 'Sekretariat Daerah',
    is_active: true,
    application_count: 2,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'c8888888-8888-8888-8888-888888888888',
    code: 'BAPPERIDA',
    name: 'Badan Perencanaan Pembangunan, Riset dan Inovasi Daerah',
    is_active: true,
    application_count: 1,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'c9999999-9999-9999-9999-999999999999',
    code: 'INSPEKTORAT',
    name: 'Inspektorat Daerah',
    is_active: true,
    application_count: 0,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
];

@Injectable()
export class OpdService {
  private inMemoryOpds: OpdUnitItem[] = [...DEFAULT_OPD_UNITS];

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly auditService: AuditService,
  ) {}

  async listOpds(query?: ListOpdQueryDto, forAdmin = false): Promise<OpdUnitItem[]> {
    try {
      const client = this.supabaseService.getClient();
      let dbQuery = client
        .from('opd_units')
        .select(`
          id, code, name, is_active, created_at, updated_at,
          applicants ( id )
        `);

      if (!forAdmin) {
        dbQuery = dbQuery.eq('is_active', true);
      } else if (query?.is_active !== undefined) {
        dbQuery = dbQuery.eq('is_active', query.is_active);
      }

      if (query?.search) {
        dbQuery = dbQuery.or(`name.ilike.%${query.search}%,code.ilike.%${query.search}%`);
      }

      const { data, error } = await dbQuery.order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          code: d.code,
          name: d.name,
          is_active: d.is_active,
          application_count: Array.isArray(d.applicants) ? d.applicants.length : 0,
          created_at: d.created_at,
          updated_at: d.updated_at,
        }));
      }
    } catch {
      // Fallback
    }

    let result = [...this.inMemoryOpds];
    if (!forAdmin) {
      result = result.filter((o) => o.is_active);
    } else if (query?.is_active !== undefined) {
      result = result.filter((o) => o.is_active === query.is_active);
    }

    if (query?.search) {
      const s = query.search.toLowerCase();
      result = result.filter(
        (o) => o.name.toLowerCase().includes(s) || o.code.toLowerCase().includes(s),
      );
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getOpdDetail(id: string): Promise<OpdUnitItem> {
    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('opd_units')
        .select(`
          id, code, name, is_active, created_at, updated_at,
          applicants ( id )
        `)
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          code: data.code,
          name: data.name,
          is_active: data.is_active,
          application_count: Array.isArray(data.applicants) ? data.applicants.length : 0,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }
    } catch {
      // Fallback
    }

    const found = this.inMemoryOpds.find((o) => o.id === id);
    if (!found) {
      throw new NotFoundException(`Perangkat Daerah dengan ID "${id}" tidak ditemukan.`);
    }
    return found;
  }

  async createOpd(dto: CreateOpdDto, actorId?: string): Promise<OpdUnitItem> {
    const code = dto.code.trim().toUpperCase();
    const name = dto.name.trim();

    if (!code || !name) {
      throw new BadRequestException('Kode dan nama Perangkat Daerah wajib diisi.');
    }

    const existing = this.inMemoryOpds.find((o) => o.code === code);
    if (existing) {
      throw new ConflictException(`Kode OPD "${code}" telah terdaftar pada sistem.`);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newOpd: OpdUnitItem = {
      id,
      code,
      name,
      is_active: dto.is_active !== undefined ? dto.is_active : true,
      application_count: 0,
      created_at: now,
      updated_at: now,
    };

    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('opd_units')
        .insert({
          id,
          code,
          name,
          is_active: newOpd.is_active,
        })
        .select()
        .single();

      if (!error && data) {
        newOpd.created_at = data.created_at;
        newOpd.updated_at = data.updated_at;
      }
    } catch {
      // Fallback
    }

    this.inMemoryOpds.push(newOpd);

    await this.auditService.record({
      actor_profile_id: actorId,
      action: 'OPD_CREATED',
      entity_type: 'opd_units',
      entity_id: id,
      new_data: { code, name, is_active: newOpd.is_active },
    });

    return newOpd;
  }

  async updateOpd(id: string, dto: UpdateOpdDto, actorId?: string): Promise<OpdUnitItem> {
    const current = await this.getOpdDetail(id);
    const oldData = { ...current };

    if (dto.code) {
      const code = dto.code.trim().toUpperCase();
      const duplicate = this.inMemoryOpds.find((o) => o.code === code && o.id !== id);
      if (duplicate) {
        throw new ConflictException(`Kode OPD "${code}" telah digunakan oleh unit lain.`);
      }
      current.code = code;
    }

    if (dto.name) {
      current.name = dto.name.trim();
    }

    if (dto.is_active !== undefined) {
      current.is_active = dto.is_active;
    }

    current.updated_at = new Date().toISOString();

    try {
      const client = this.supabaseService.getClient();
      await client
        .from('opd_units')
        .update({
          code: current.code,
          name: current.name,
          is_active: current.is_active,
          updated_at: current.updated_at,
        })
        .eq('id', id);
    } catch {
      // Fallback
    }

    await this.auditService.record({
      actor_profile_id: actorId,
      action: 'OPD_UPDATED',
      entity_type: 'opd_units',
      entity_id: id,
      old_data: oldData as any,
      new_data: { code: current.code, name: current.name, is_active: current.is_active },
    });

    return current;
  }

  async toggleOpdStatus(id: string, isActive: boolean, actorId?: string): Promise<OpdUnitItem> {
    const opd = await this.getOpdDetail(id);
    const oldStatus = opd.is_active;
    opd.is_active = isActive;
    opd.updated_at = new Date().toISOString();

    try {
      const client = this.supabaseService.getClient();
      await client
        .from('opd_units')
        .update({
          is_active: isActive,
          updated_at: opd.updated_at,
        })
        .eq('id', id);
    } catch {
      // Fallback
    }

    await this.auditService.record({
      actor_profile_id: actorId,
      action: isActive ? 'OPD_ACTIVATED' : 'OPD_DEACTIVATED',
      entity_type: 'opd_units',
      entity_id: id,
      old_data: { is_active: oldStatus },
      new_data: { is_active: isActive },
    });

    return opd;
  }
}
