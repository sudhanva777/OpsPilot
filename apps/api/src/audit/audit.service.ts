import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity.js';
import { AuditAction, AuditResourceType } from '../common/types/enums.js';

interface CreateAuditLogDto {
  actorId?: string | null;
  action: AuditAction;
  resourceType?: AuditResourceType | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * AuditService — records security and business-critical actions.
 *
 * Callers should NOT await audit logging if it would delay the primary response.
 * Audit failures are logged but never bubble up to the client.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Record an audit event. Fire-and-forget safe — exceptions are caught
   * and logged internally without propagating to callers.
   */
  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      const log = this.auditLogRepository.create({
        actorId: dto.actorId ?? null,
        action: dto.action,
        resourceType: dto.resourceType ?? null,
        resourceId: dto.resourceId ?? null,
        metadata: dto.metadata ?? {},
        ipAddress: dto.ipAddress ?? null,
      });
      await this.auditLogRepository.save(log);
    } catch (error) {
      // Audit failures must never crash the application
      this.logger.error('Failed to write audit log', error);
    }
  }
}
