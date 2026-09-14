/**
 * Audit service: append-only writes to the immutable audit log.
 *
 * Records significant actions with the acting user, any impersonation marker,
 * and structured detail. The log is never updated or deleted.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

/** Input for recording an audit entry. */
export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string | null;
  actorUserId: string;
  impersonatedBy?: string | null;
  siteId?: string | null;
  detail?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLog: Repository<AuditLog>,
  ) {}

  /**
   * Append an entry to the audit log.
   *
   * Args:
   *   entry: The audit entry.
   *
   * Returns:
   *   The created audit log record.
   */
  async record(entry: AuditEntry): Promise<AuditLog> {
    const log = this.auditLog.create({
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      actorUserId: entry.actorUserId,
      impersonatedBy: entry.impersonatedBy ?? null,
      siteId: entry.siteId ?? null,
      detail: entry.detail ? JSON.stringify(entry.detail) : null,
    });
    return this.auditLog.save(log);
  }

  /**
   * List audit entries, optionally filtered by entity or site.
   *
   * Args:
   *   filters: Optional entityType, entityId, or siteId filters.
   *
   * Returns:
   *   Audit entries ordered by creation time (newest first).
   */
  async list(filters: {
    entityType?: string;
    entityId?: string;
    siteId?: string;
  }): Promise<AuditLog[]> {
    const qb = this.auditLog
      .createQueryBuilder('a')
      .orderBy('a.createdAt', 'DESC');
    if (filters.entityType) {
      qb.andWhere('a.entityType = :entityType', {
        entityType: filters.entityType,
      });
    }
    if (filters.entityId) {
      qb.andWhere('a.entityId = :entityId', { entityId: filters.entityId });
    }
    if (filters.siteId) {
      qb.andWhere('a.siteId = :siteId', { siteId: filters.siteId });
    }
    return qb.getMany();
  }
}
