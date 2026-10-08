import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident } from './entities/incident.entity.js';
import { IncidentEvent } from './entities/incident-event.entity.js';
import { CreateIncidentDto } from './dto/create-incident.dto.js';
import { UpdateIncidentDto } from './dto/update-incident.dto.js';
import { ChangeIncidentStatusDto } from './dto/change-incident-status.dto.js';
import { ProjectsService } from '../projects/projects.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  IncidentStatus,
  IncidentEventType,
  AuditAction,
  AuditResourceType,
} from '../common/types/enums.js';

/**
 * Incident status state machine.
 *
 * Defines which transitions are valid. The service enforces this —
 * the client can request any status string, but only valid transitions succeed.
 *
 * Valid forward path:
 *   OPEN → INVESTIGATING → MITIGATED → RESOLVED → CLOSED
 *
 * Reopening is explicitly permitted:
 *   RESOLVED → INVESTIGATING
 *   CLOSED   → INVESTIGATING
 */
const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.OPEN]: [IncidentStatus.INVESTIGATING, IncidentStatus.RESOLVED],
  [IncidentStatus.INVESTIGATING]: [
    IncidentStatus.MITIGATED,
    IncidentStatus.RESOLVED,
    IncidentStatus.OPEN,
  ],
  [IncidentStatus.MITIGATED]: [
    IncidentStatus.RESOLVED,
    IncidentStatus.INVESTIGATING,
  ],
  [IncidentStatus.RESOLVED]: [
    IncidentStatus.CLOSED,
    IncidentStatus.INVESTIGATING,
  ],
  [IncidentStatus.CLOSED]: [IncidentStatus.INVESTIGATING],
};

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    @InjectRepository(Incident)
    private readonly incidentsRepository: Repository<Incident>,
    @InjectRepository(IncidentEvent)
    private readonly eventsRepository: Repository<IncidentEvent>,
    private readonly projectsService: ProjectsService,
    private readonly auditService: AuditService,
  ) {}

  // ─── Authorization helper ────────────────────────────────────────────────

  private async requireIncidentAccess(
    userId: string,
    incidentId: string,
  ): Promise<Incident> {
    const incident = await this.incidentsRepository.findOne({
      where: { id: incidentId },
      relations: ['createdBy', 'assignedTo', 'project'],
    });

    if (!incident) {
      throw new NotFoundException({
        code: 'INCIDENT_NOT_FOUND',
        message: 'Incident not found.',
      });
    }

    // Verify the user has access to the incident's project
    await this.projectsService.requireMembership(userId, incident.projectId);

    return incident;
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(
    userId: string,
    projectId: string,
    dto: CreateIncidentDto,
  ): Promise<Incident> {
    // Verify project access
    await this.projectsService.requireMembership(userId, projectId);

    const incident = this.incidentsRepository.create({
      projectId,
      title: dto.title.trim(),
      description: dto.description?.trim() ?? null,
      service: dto.service?.trim() ?? null,
      severity: dto.severity,
      status: IncidentStatus.OPEN,
      createdById: userId,
      assignedToId: dto.assignedToId ?? null,
    });

    const saved = await this.incidentsRepository.save(incident);

    // Record creation event
    await this.recordEvent(saved.id, userId, IncidentEventType.INCIDENT_CREATED, {
      title: saved.title,
      severity: saved.severity,
      service: saved.service,
    });

    void this.auditService.log({
      actorId: userId,
      action: AuditAction.INCIDENT_CREATED,
      resourceType: AuditResourceType.INCIDENT,
      resourceId: saved.id,
      metadata: { projectId, title: saved.title, severity: saved.severity },
    });

    this.logger.log(`Incident created: ${saved.id} in project ${projectId}`);

    return saved;
  }

  async findAllForProject(userId: string, projectId: string): Promise<Incident[]> {
    await this.projectsService.requireMembership(userId, projectId);

    return this.incidentsRepository.find({
      where: { projectId },
      relations: ['createdBy', 'assignedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(userId: string, incidentId: string): Promise<Incident> {
    return this.requireIncidentAccess(userId, incidentId);
  }

  async update(
    userId: string,
    incidentId: string,
    dto: UpdateIncidentDto,
  ): Promise<Incident> {
    const incident = await this.requireIncidentAccess(userId, incidentId);

    const changes: Record<string, unknown> = {};

    if (dto.title !== undefined) {
      changes['title'] = { from: incident.title, to: dto.title };
      incident.title = dto.title.trim();
    }
    if (dto.description !== undefined) {
      incident.description = dto.description?.trim() ?? null;
    }
    if (dto.service !== undefined) {
      incident.service = dto.service?.trim() ?? null;
    }
    if (dto.severity !== undefined && dto.severity !== incident.severity) {
      changes['severity'] = { from: incident.severity, to: dto.severity };
      await this.recordEvent(
        incidentId,
        userId,
        IncidentEventType.SEVERITY_CHANGED,
        { from: incident.severity, to: dto.severity },
      );
      incident.severity = dto.severity;
    }
    if (dto.assignedToId !== undefined && dto.assignedToId !== incident.assignedToId) {
      changes['assignedTo'] = { from: incident.assignedToId, to: dto.assignedToId };
      await this.recordEvent(
        incidentId,
        userId,
        IncidentEventType.ASSIGNEE_CHANGED,
        { fromId: incident.assignedToId, toId: dto.assignedToId },
      );
      incident.assignedToId = dto.assignedToId ?? null;
    }

    const updated = await this.incidentsRepository.save(incident);

    if (Object.keys(changes).length > 0) {
      await this.recordEvent(incidentId, userId, IncidentEventType.INCIDENT_UPDATED, changes);

      void this.auditService.log({
        actorId: userId,
        action: AuditAction.INCIDENT_UPDATED,
        resourceType: AuditResourceType.INCIDENT,
        resourceId: incidentId,
        metadata: { changes },
      });
    }

    return updated;
  }

  async changeStatus(
    userId: string,
    incidentId: string,
    dto: ChangeIncidentStatusDto,
  ): Promise<Incident> {
    const incident = await this.requireIncidentAccess(userId, incidentId);

    const { status: newStatus, comment } = dto;
    const currentStatus = incident.status;

    // Enforce state machine
    const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException({
        code: 'INVALID_INCIDENT_STATUS_TRANSITION',
        message: `Incident cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}.`,
      });
    }

    incident.status = newStatus;

    // Set resolvedAt when incident is resolved or closed
    if (
      newStatus === IncidentStatus.RESOLVED ||
      newStatus === IncidentStatus.CLOSED
    ) {
      incident.resolvedAt = incident.resolvedAt ?? new Date();
    }
    // Clear resolvedAt if reopened
    if (newStatus === IncidentStatus.INVESTIGATING && incident.resolvedAt) {
      incident.resolvedAt = null;
    }

    const updated = await this.incidentsRepository.save(incident);

    // Determine event type
    let eventType = IncidentEventType.STATUS_CHANGED;
    if (newStatus === IncidentStatus.RESOLVED) eventType = IncidentEventType.INCIDENT_RESOLVED;
    if (newStatus === IncidentStatus.CLOSED) eventType = IncidentEventType.INCIDENT_CLOSED;
    if (
      newStatus === IncidentStatus.INVESTIGATING &&
      [IncidentStatus.RESOLVED, IncidentStatus.CLOSED].includes(currentStatus)
    ) {
      eventType = IncidentEventType.INCIDENT_REOPENED;
    }

    await this.recordEvent(incidentId, userId, eventType, {
      from: currentStatus,
      to: newStatus,
      comment: comment ?? null,
    });

    void this.auditService.log({
      actorId: userId,
      action: AuditAction.INCIDENT_STATUS_CHANGED,
      resourceType: AuditResourceType.INCIDENT,
      resourceId: incidentId,
      metadata: { from: currentStatus, to: newStatus },
    });

    this.logger.log(
      `Incident ${incidentId} status: ${currentStatus} → ${newStatus} by user ${userId}`,
    );

    return updated;
  }

  async getEvents(userId: string, incidentId: string): Promise<IncidentEvent[]> {
    await this.requireIncidentAccess(userId, incidentId);

    return this.eventsRepository.find({
      where: { incidentId },
      relations: ['actor'],
      order: { createdAt: 'ASC' },
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async recordEvent(
    incidentId: string,
    actorId: string | null,
    eventType: IncidentEventType,
    metadata: Record<string, unknown> = {},
  ): Promise<IncidentEvent> {
    const event = this.eventsRepository.create({
      incidentId,
      actorId,
      eventType,
      metadata,
    });
    return this.eventsRepository.save(event);
  }
}
