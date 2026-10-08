import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { InvestigationsService } from './investigations.service.js';
import { InvestigationStatus, IncidentSeverity, IncidentStatus } from '../common/types/enums.js';

const mockIncident = {
  id: 'incident-uuid-1',
  projectId: 'project-uuid-1',
  title: 'Payment requests returning HTTP 500',
  description: 'Connection pool exhausted in payment service',
  service: 'payment-service',
  severity: IncidentSeverity.CRITICAL,
  status: IncidentStatus.OPEN,
  createdAt: new Date(),
};

const mockInvestigation = {
  id: 'inv-uuid-1',
  incidentId: 'incident-uuid-1',
  status: InvestigationStatus.COMPLETED,
  startedAt: new Date(),
  completedAt: new Date(),
  summary: 'Investigation concluded: Database connection pool exhaustion.',
  rootCause: 'Database connection pool exhaustion',
  confidence: 0.93,
  confidenceFactors: ['Pool reached 100% capacity'],
  error: null,
  incident: mockIncident,
  evidence: [],
  hypotheses: [],
  recommendation: null,
  agentRuns: [],
};

const mockInvestigationsRepository = {
  findOne: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  save: vi.fn(),
};

const mockEvidenceRepository = {
  create: vi.fn().mockImplementation((val) => val),
  save: vi.fn().mockResolvedValue([]),
  find: vi.fn(),
};

const mockHypothesesRepository = {
  create: vi.fn().mockImplementation((val) => val),
  save: vi.fn().mockResolvedValue([]),
  find: vi.fn(),
};

const mockRecommendationRepository = {
  create: vi.fn().mockImplementation((val) => val),
  save: vi.fn().mockResolvedValue({}),
  findOne: vi.fn(),
};

const mockAgentRunsRepository = {
  create: vi.fn().mockImplementation((val) => val),
  save: vi.fn().mockResolvedValue([]),
  find: vi.fn(),
};

const mockIncidentsRepository = {
  findOne: vi.fn(),
};

const mockProjectsService = {
  requireMembership: vi.fn(),
};

const mockAuditService = {
  log: vi.fn().mockResolvedValue(undefined),
};

const mockConfigService = {
  get: vi.fn().mockReturnValue('http://localhost:8000'),
};

describe('InvestigationsService', () => {
  let service: InvestigationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InvestigationsService(
      mockInvestigationsRepository as any,
      mockEvidenceRepository as any,
      mockHypothesesRepository as any,
      mockRecommendationRepository as any,
      mockAgentRunsRepository as any,
      mockIncidentsRepository as any,
      mockProjectsService as any,
      mockAuditService as any,
      mockConfigService as any,
    );
  });

  describe('startInvestigation', () => {
    it('throws NotFoundException if incident does not exist', async () => {
      mockIncidentsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.startInvestigation('user-1', 'nonexistent-incident'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if user is not a project member', async () => {
      mockIncidentsRepository.findOne.mockResolvedValue(mockIncident);
      mockProjectsService.requireMembership.mockRejectedValue(
        new ForbiddenException('You do not have access to this project.'),
      );

      await expect(
        service.startInvestigation('unauthorized-user', mockIncident.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('successfully initiates and completes investigation via AI service', async () => {
      mockIncidentsRepository.findOne.mockResolvedValue(mockIncident);
      mockProjectsService.requireMembership.mockResolvedValue(undefined);

      const createdInv = {
        id: 'inv-uuid-1',
        incidentId: mockIncident.id,
        status: InvestigationStatus.RUNNING,
        startedAt: new Date(),
        confidenceFactors: [],
      };
      mockInvestigationsRepository.create.mockReturnValue(createdInv);
      mockInvestigationsRepository.save.mockResolvedValue(createdInv);

      // Mock successful fetch to AI service
      const aiResponse = {
        id: 'inv-uuid-1',
        incidentId: mockIncident.id,
        status: InvestigationStatus.COMPLETED,
        rootCause: 'Database connection pool exhaustion',
        confidence: 0.93,
        confidenceFactors: ['Database pool saturation at 100%'],
        evidence: [
          {
            id: 'ev-1',
            type: 'DATABASE',
            source: 'database:primary',
            title: 'Database Pool Health',
            content: 'Active connections: 50/50',
            collectedAt: new Date().toISOString(),
          },
        ],
        hypotheses: [
          {
            id: 'hyp-1',
            description: 'Database connection pool exhaustion',
            confidence: 0.93,
            status: 'SUPPORTED',
            reasoning: 'Pool at 100% capacity',
          },
        ],
        recommendation: {
          id: 'rec-1',
          action: 'Increase DB connection capacity',
          reason: 'All slots saturated',
          riskLevel: 'HIGH',
          confidence: 0.93,
          requiresApproval: true,
          remediationExecuted: false,
        },
        agentRuns: [
          {
            agent: 'DatabaseAgent',
            status: 'COMPLETED',
            startedAt: new Date().toISOString(),
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => aiResponse,
      } as any);

      mockInvestigationsRepository.findOne.mockResolvedValue({
        ...createdInv,
        ...aiResponse,
        incident: mockIncident,
      });

      const result = await service.startInvestigation('user-1', mockIncident.id);

      expect(result).toBeDefined();
      expect(result.rootCause).toBe('Database connection pool exhaustion');
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('throws InternalServerErrorException and records failure when AI service is unavailable', async () => {
      mockIncidentsRepository.findOne.mockResolvedValue(mockIncident);
      mockProjectsService.requireMembership.mockResolvedValue(undefined);

      const createdInv = {
        id: 'inv-uuid-1',
        incidentId: mockIncident.id,
        status: InvestigationStatus.RUNNING,
        startedAt: new Date(),
      };
      mockInvestigationsRepository.create.mockReturnValue(createdInv);
      mockInvestigationsRepository.save.mockResolvedValue(createdInv);

      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      await expect(
        service.startInvestigation('user-1', mockIncident.id),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockInvestigationsRepository.save).toHaveBeenCalled();
    });
  });

  describe('query methods', () => {
    it('returns investigations list for incident', async () => {
      mockIncidentsRepository.findOne.mockResolvedValue(mockIncident);
      mockProjectsService.requireMembership.mockResolvedValue(undefined);
      mockInvestigationsRepository.find.mockResolvedValue([mockInvestigation]);

      const list = await service.findAllForIncident('user-1', mockIncident.id);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(mockInvestigation.id);
    });

    it('returns investigation detail by ID', async () => {
      mockInvestigationsRepository.findOne
        .mockResolvedValueOnce(mockInvestigation) // for requireInvestigationAccess
        .mockResolvedValueOnce(mockInvestigation); // for findById query
      mockProjectsService.requireMembership.mockResolvedValue(undefined);

      const inv = await service.findById('user-1', mockInvestigation.id);
      expect(inv.id).toBe(mockInvestigation.id);
    });
  });
});
