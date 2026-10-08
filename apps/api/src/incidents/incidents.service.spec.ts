import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IncidentsService } from './incidents.service.js';
import { IncidentStatus, IncidentSeverity } from '../common/types/enums.js';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const makeIncident = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'incident-uuid-1',
  projectId: 'project-uuid-1',
  title: 'Test Incident',
  description: null,
  service: 'test-service',
  severity: IncidentSeverity.HIGH,
  status: IncidentStatus.OPEN,
  createdById: 'user-uuid-1',
  assignedToId: null,
  resolvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: { id: 'user-uuid-1', name: 'Test User', email: 'test@example.com' },
  assignedTo: null,
  project: { id: 'project-uuid-1', name: 'Test Project' },
  ...overrides,
});

const mockIncidentsRepository = {
  findOne: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  save: vi.fn(),
};

const mockEventsRepository = {
  create: vi.fn(),
  save: vi.fn(),
};

const mockProjectsService = {
  requireMembership: vi.fn(),
};

const mockAuditService = {
  log: vi.fn().mockResolvedValue(undefined),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('IncidentsService', () => {
  let incidentsService: IncidentsService;

  beforeEach(() => {
    vi.clearAllMocks();
    incidentsService = new IncidentsService(
      mockIncidentsRepository as any,
      mockEventsRepository as any,
      mockProjectsService as any,
      mockAuditService as any,
    );
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create an incident with OPEN status', async () => {
      mockProjectsService.requireMembership.mockResolvedValue(undefined);
      const incident = makeIncident({ status: IncidentStatus.OPEN });
      mockIncidentsRepository.create.mockReturnValue(incident);
      mockIncidentsRepository.save.mockResolvedValue(incident);
      mockEventsRepository.create.mockReturnValue({});
      mockEventsRepository.save.mockResolvedValue({});

      const result = await incidentsService.create('user-uuid-1', 'project-uuid-1', {
        title: 'Test Incident',
        severity: IncidentSeverity.HIGH,
      });

      expect(result.status).toBe(IncidentStatus.OPEN);
      expect(mockProjectsService.requireMembership).toHaveBeenCalledWith('user-uuid-1', 'project-uuid-1');
    });

    it('should throw ForbiddenException when user is not a project member', async () => {
      mockProjectsService.requireMembership.mockRejectedValue(
        new ForbiddenException({ code: 'ACCESS_DENIED', message: 'Access denied' }),
      );

      await expect(
        incidentsService.create('user-uuid-1', 'project-uuid-1', {
          title: 'Test',
          severity: IncidentSeverity.LOW,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── changeStatus — state machine ──────────────────────────────────────────

  describe('changeStatus', () => {
    const validTransitions: [IncidentStatus, IncidentStatus][] = [
      [IncidentStatus.OPEN, IncidentStatus.INVESTIGATING],
      [IncidentStatus.OPEN, IncidentStatus.RESOLVED],
      [IncidentStatus.INVESTIGATING, IncidentStatus.MITIGATED],
      [IncidentStatus.INVESTIGATING, IncidentStatus.RESOLVED],
      [IncidentStatus.INVESTIGATING, IncidentStatus.OPEN],
      [IncidentStatus.MITIGATED, IncidentStatus.RESOLVED],
      [IncidentStatus.MITIGATED, IncidentStatus.INVESTIGATING],
      [IncidentStatus.RESOLVED, IncidentStatus.CLOSED],
      [IncidentStatus.RESOLVED, IncidentStatus.INVESTIGATING],
      [IncidentStatus.CLOSED, IncidentStatus.INVESTIGATING],
    ];

    it.each(validTransitions)(
      'should allow transition from %s to %s',
      async (from, to) => {
        const incident = makeIncident({ status: from });
        mockIncidentsRepository.findOne.mockResolvedValue(incident);
        mockProjectsService.requireMembership.mockResolvedValue(undefined);
        const updated = { ...incident, status: to };
        mockIncidentsRepository.save.mockResolvedValue(updated);
        mockEventsRepository.create.mockReturnValue({});
        mockEventsRepository.save.mockResolvedValue({});

        const result = await incidentsService.changeStatus('user-uuid-1', 'incident-uuid-1', {
          status: to,
        });

        expect(result.status).toBe(to);
      },
    );

    const invalidTransitions: [IncidentStatus, IncidentStatus][] = [
      [IncidentStatus.OPEN, IncidentStatus.MITIGATED],
      [IncidentStatus.OPEN, IncidentStatus.CLOSED],
      [IncidentStatus.CLOSED, IncidentStatus.OPEN],
      [IncidentStatus.CLOSED, IncidentStatus.RESOLVED],
      [IncidentStatus.CLOSED, IncidentStatus.MITIGATED],
    ];

    it.each(invalidTransitions)(
      'should reject invalid transition from %s to %s',
      async (from, to) => {
        const incident = makeIncident({ status: from });
        mockIncidentsRepository.findOne.mockResolvedValue(incident);
        mockProjectsService.requireMembership.mockResolvedValue(undefined);

        await expect(
          incidentsService.changeStatus('user-uuid-1', 'incident-uuid-1', { status: to }),
        ).rejects.toThrow(BadRequestException);
      },
    );

    it('should set resolvedAt when incident is resolved', async () => {
      const incident = makeIncident({ status: IncidentStatus.INVESTIGATING, resolvedAt: null });
      mockIncidentsRepository.findOne.mockResolvedValue(incident);
      mockProjectsService.requireMembership.mockResolvedValue(undefined);
      mockIncidentsRepository.save.mockImplementation((inc: any) => Promise.resolve(inc));
      mockEventsRepository.create.mockReturnValue({});
      mockEventsRepository.save.mockResolvedValue({});

      const result = await incidentsService.changeStatus('user-uuid-1', 'incident-uuid-1', {
        status: IncidentStatus.RESOLVED,
      });

      expect(result.resolvedAt).not.toBeNull();
    });

    it('should clear resolvedAt when incident is reopened from RESOLVED', async () => {
      const incident = makeIncident({
        status: IncidentStatus.RESOLVED,
        resolvedAt: new Date('2024-01-01'),
      });
      mockIncidentsRepository.findOne.mockResolvedValue(incident);
      mockProjectsService.requireMembership.mockResolvedValue(undefined);
      mockIncidentsRepository.save.mockImplementation((inc: any) => Promise.resolve(inc));
      mockEventsRepository.create.mockReturnValue({});
      mockEventsRepository.save.mockResolvedValue({});

      const result = await incidentsService.changeStatus('user-uuid-1', 'incident-uuid-1', {
        status: IncidentStatus.INVESTIGATING,
      });

      expect(result.resolvedAt).toBeNull();
    });

    it('should throw NotFoundException when incident does not exist', async () => {
      mockIncidentsRepository.findOne.mockResolvedValue(null);

      await expect(
        incidentsService.changeStatus('user-uuid-1', 'nonexistent-id', {
          status: IncidentStatus.INVESTIGATING,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user lacks project access', async () => {
      const incident = makeIncident({ status: IncidentStatus.OPEN });
      mockIncidentsRepository.findOne.mockResolvedValue(incident);
      mockProjectsService.requireMembership.mockRejectedValue(
        new ForbiddenException({ code: 'ACCESS_DENIED', message: 'Access denied' }),
      );

      await expect(
        incidentsService.changeStatus('user-b-uuid', 'incident-uuid-1', {
          status: IncidentStatus.INVESTIGATING,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── findById — authorization ──────────────────────────────────────────────

  describe('findById', () => {
    it('should return incident when user has access', async () => {
      const incident = makeIncident();
      mockIncidentsRepository.findOne.mockResolvedValue(incident);
      mockProjectsService.requireMembership.mockResolvedValue(undefined);

      const result = await incidentsService.findById('user-uuid-1', 'incident-uuid-1');
      expect(result.id).toBe('incident-uuid-1');
    });

    it('should throw NotFoundException for missing incident', async () => {
      mockIncidentsRepository.findOne.mockResolvedValue(null);

      await expect(
        incidentsService.findById('user-uuid-1', 'bad-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not in project', async () => {
      const incident = makeIncident();
      mockIncidentsRepository.findOne.mockResolvedValue(incident);
      mockProjectsService.requireMembership.mockRejectedValue(
        new ForbiddenException({ code: 'ACCESS_DENIED', message: 'Access denied' }),
      );

      await expect(
        incidentsService.findById('other-user-id', 'incident-uuid-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
