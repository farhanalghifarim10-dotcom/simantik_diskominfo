import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { SupabaseService } from '../supabase/supabase.service.js';
import { isInMemoryFallbackAllowed } from '../common/utils/supabase.utils.js';
import type {
  AuditLogListItem,
  ListAuditLogsQueryDto,
  PaginatedAuditLogsResponse,
  RecordAuditLogEntry,
} from './audit.types.js';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private inMemoryAuditLogs: AuditLogListItem[] = [];

  constructor(private readonly supabaseService: SupabaseService) {
    if (isInMemoryFallbackAllowed()) {
      this.seedInitialLogs();
    }
  }

  private seedInitialLogs() {
    const now = new Date().toISOString();
    this.inMemoryAuditLogs.push(
      {
        id: 'aud-seed-001',
        actor_profile_id: 'u-admin-1',
        actor_name: 'Budi Santoso, S.Kom',
        actor_role: 'SUPER_ADMIN',
        application_id: 'a1000000-0000-0000-0000-000000000001',
        action: 'SYSTEM_BOOTSTRAP',
        entity_type: 'system',
        entity_id: 'sys-init',
        old_data: null,
        new_data: { message: 'Inisialisasi sistem SIMANTIK master data' },
        ip_address: '127.0.0.1',
        user_agent: 'System/1.0',
        created_at: now,
      },
    );
  }

  /**
   * Catat mutasi atau aksi administratif ke jejak audit (audit_logs)
   */
  async record(entry: RecordAuditLogEntry): Promise<AuditLogListItem> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const actorName = entry.actor_profile_id
      ? 'Administrator Diskominfo'
      : entry.action === 'APPLICATION_SUBMITTED'
        ? 'Pemohon Publik (OPD)'
        : 'Sistem Otomatis';

    const actorRole = entry.actor_profile_id
      ? 'SUPER_ADMIN'
      : entry.action === 'APPLICATION_SUBMITTED'
        ? 'PUBLIC'
        : 'SYSTEM';

    const newLog: AuditLogListItem = {
      id,
      actor_profile_id: entry.actor_profile_id || null,
      actor_name: actorName,
      actor_role: actorRole,
      application_id: entry.application_id || null,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id || null,
      old_data: entry.old_data || null,
      new_data: entry.new_data || null,
      ip_address: entry.ip_address || null,
      user_agent: entry.user_agent || null,
      created_at: createdAt,
    };

    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('audit_logs')
        .insert({
          id,
          actor_profile_id: entry.actor_profile_id || null,
          application_id: entry.application_id || null,
          action: entry.action,
          entity_type: entry.entity_type,
          entity_id: entry.entity_id || null,
          old_data: entry.old_data || null,
          new_data: entry.new_data || null,
          ip_address: entry.ip_address || null,
          user_agent: entry.user_agent || null,
        })
        .select()
        .single();

      if (!error && data) {
        if (isInMemoryFallbackAllowed()) {
          this.inMemoryAuditLogs.unshift(newLog);
        }
        return newLog;
      }

      if (error) {
        this.logger.warn(
          `Gagal menyimpan audit log ke Supabase: ${error.message} (code: ${error.code})`,
        );
      }
    } catch (err) {
      this.logger.debug(`Audit record fallback to memory: ${(err as Error).message}`);
    }

    if (isInMemoryFallbackAllowed()) {
      this.inMemoryAuditLogs.unshift(newLog);
    }
    return newLog;
  }

  /**
   * Mengambil daftar log audit dengan filter dan paginasi
   */
  async listLogs(query: ListAuditLogsQueryDto): Promise<PaginatedAuditLogsResponse> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const offset = (page - 1) * limit;

    try {
      const client = this.supabaseService.getClient();
      let dbQuery = client
        .from('audit_logs')
        .select(`
          id, actor_profile_id, application_id, action, entity_type, entity_id,
          old_data, new_data, ip_address, user_agent, created_at,
          profiles:actor_profile_id (full_name, role)
        `, { count: 'exact' });

      if (query.entity_type) {
        dbQuery = dbQuery.eq('entity_type', query.entity_type);
      }
      if (query.action) {
        dbQuery = dbQuery.ilike('action', `%${query.action}%`);
      }

      const { data, count, error } = await dbQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        this.logger.error(`Gagal memuat log audit dari Supabase: ${error.message}`);
        if (!isInMemoryFallbackAllowed()) {
          throw new InternalServerErrorException('Gagal memuat log audit dari basis data.');
        }
      } else if (data !== null && data !== undefined) {
        const total = count || data.length;
        const items: AuditLogListItem[] = data.map((row: any) => ({
          id: row.id,
          actor_profile_id: row.actor_profile_id,
          actor_name: row.actor_profile_id
            ? row.profiles?.full_name || 'Administrator Diskominfo'
            : row.action === 'APPLICATION_SUBMITTED'
              ? 'Pemohon Publik (OPD)'
              : 'Sistem Otomatis',
          actor_role: row.actor_profile_id
            ? row.profiles?.role || 'SUPER_ADMIN'
            : row.action === 'APPLICATION_SUBMITTED'
              ? 'PUBLIC'
              : 'SYSTEM',
          application_id: row.application_id,
          action: row.action,
          entity_type: row.entity_type,
          entity_id: row.entity_id,
          old_data: row.old_data,
          new_data: row.new_data,
          ip_address: row.ip_address,
          user_agent: row.user_agent,
          created_at: row.created_at,
        }));

        return {
          items,
          pagination: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit),
          },
        };
      }
    } catch (err) {
      if (err instanceof InternalServerErrorException) throw err;
      this.logger.error(`Error listLogs: ${err instanceof Error ? err.message : String(err)}`);
      if (!isInMemoryFallbackAllowed()) {
        throw new InternalServerErrorException('Gagal memuat log audit dari basis data.');
      }
    }

    if (!isInMemoryFallbackAllowed()) {
      return {
        items: [],
        pagination: { page, limit, total: 0, total_pages: 0 },
      };
    }

    // In-memory filter
    let filtered = [...this.inMemoryAuditLogs];
    if (query.entity_type) {
      filtered = filtered.filter((l) => l.entity_type.toLowerCase() === query.entity_type?.toLowerCase());
    }
    if (query.action) {
      filtered = filtered.filter((l) => l.action.toLowerCase().includes(query.action!.toLowerCase()));
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.action.toLowerCase().includes(s) ||
          l.entity_type.toLowerCase().includes(s) ||
          (l.actor_name && l.actor_name.toLowerCase().includes(s)),
      );
    }

    const total = filtered.length;
    const paginatedItems = filtered.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }
}
