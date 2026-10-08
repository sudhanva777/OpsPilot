import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Investigation } from './entities/investigation.entity.js';
import { InvestigationEvidence } from './entities/investigation-evidence.entity.js';
import { InvestigationHypothesis } from './entities/investigation-hypothesis.entity.js';
import { InvestigationRecommendation } from './entities/investigation-recommendation.entity.js';
import { AgentRun } from './entities/agent-run.entity.js';
import { Incident } from '../incidents/entities/incident.entity.js';

import { ProjectsService } from '../projects/projects.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  InvestigationStatus,
  AuditAction,
  AuditResourceType,
} from '../common/types/enums.js';
import { StartInvestigationDto } from './dto/start-investigation.dto.js';

interface AiInvestigationApiResponse {
  id: string;
  incidentId: string;
  status: InvestigationStatus;
  summary?: string;
  rootCause?: string;
  confidence?: number;
  confidenceFactors?: string[];
  error?: string;
  startedAt: string;
  completedAt?: string;
  evidence?: Array<{
    id: string;
    type: string;
    source: string;
    title: string;
    content: string;
    metadata?: Record<string, unknown>;
    collectedAt: string;
  }>;
  hypotheses?: Array<{
    id: string;
    description: string;
    confidence: number;
    status: string;
    supportingEvidenceIds?: string[];
    contradictingEvidenceIds?: string[];
    reasoning: string;
  }>;
  recommendation?: {
    id: string;
    action: string;
    reason: string;
    riskLevel: string;
    confidence: number;
    requiresApproval: boolean;
    mitigationSteps?: string[];
    remediationExecuted: boolean;
  };
  agentRuns?: Array<{
    agent: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    durationMs?: number;
    inputSummary?: string;
    outputSummary?: string;
    error?: string;
    metadata?: Record<string, unknown>;
  }>;
}

@Injectable()
export class InvestigationsService {
  private readonly logger = new Logger(InvestigationsService.name);
  private readonly aiServiceUrl: string;

  constructor(
    @InjectRepository(Investigation)
    private readonly investigationsRepository: Repository<Investigation>,
    @InjectRepository(InvestigationEvidence)
    private readonly evidenceRepository: Repository<InvestigationEvidence>,
    @InjectRepository(InvestigationHypothesis)
    private readonly hypothesesRepository: Repository<InvestigationHypothesis>,
    @InjectRepository(InvestigationRecommendation)
    private readonly recommendationRepository: Repository<InvestigationRecommendation>,
    @InjectRepository(AgentRun)
    private readonly agentRunsRepository: Repository<AgentRun>,
    @InjectRepository(Incident)
    private readonly incidentsRepository: Repository<Incident>,
    private readonly projectsService: ProjectsService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {
    this.aiServiceUrl =
      this.configService.get<string>('AI_SERVICE_URL') ??
      process.env.AI_SERVICE_URL ??
      'http://localhost:8000';
  }

  // ─── Authorization Helpers ────────────────────────────────────────────────

  private async requireIncidentAccess(
    userId: string,
    incidentId: string,
  ): Promise<Incident> {
    const incident = await this.incidentsRepository.findOne({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new NotFoundException({
        code: 'INCIDENT_NOT_FOUND',
        message: 'Incident not found.',
      });
    }

    await this.projectsService.requireMembership(userId, incident.projectId);
    return incident;
  }

  private async requireInvestigationAccess(
    userId: string,
    investigationId: string,
  ): Promise<Investigation> {
    const investigation = await this.investigationsRepository.findOne({
      where: { id: investigationId },
      relations: { incident: true },
    });

    if (!investigation) {
      throw new NotFoundException({
        code: 'INVESTIGATION_NOT_FOUND',
        message: 'Investigation not found.',
      });
    }

    await this.projectsService.requireMembership(
      userId,
      investigation.incident.projectId,
    );
    return investigation;
  }

  // ─── Investigation Execution Orchestration ─────────────────────────────────

  async startInvestigation(
    userId: string,
    incidentId: string,
    dto?: StartInvestigationDto,
  ): Promise<Investigation> {
    const incident = await this.requireIncidentAccess(userId, incidentId);

    // 1. Persist initial investigation record
    const investigation = this.investigationsRepository.create({
      incidentId: incident.id,
      status: InvestigationStatus.RUNNING,
      startedAt: new Date(),
      confidenceFactors: [],
    });

    const saved = await this.investigationsRepository.save(investigation);

    void this.auditService.log({
      actorId: userId,
      action: AuditAction.INVESTIGATION_STARTED,
      resourceType: AuditResourceType.INVESTIGATION,
      resourceId: saved.id,
      metadata: { incidentId: incident.id, title: incident.title },
    });

    this.logger.log(`Investigation initiated: ${saved.id} for incident ${incident.id}`);

    // 2. Dispatch to FastAPI AI service
    try {
      const response = await fetch(`${this.aiServiceUrl}/api/v1/investigations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': process.env.INTERNAL_API_KEY ?? 'dev-internal-secret-key',
        },
        body: JSON.stringify({
          incidentId: incident.id,
          investigationId: saved.id,
          incident: {
            id: incident.id,
            projectId: incident.projectId,
            title: incident.title,
            description: incident.description,
            service: incident.service,
            severity: incident.severity,
            status: incident.status,
            createdAt: incident.createdAt,
          },
          options: dto?.options ?? {},
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `AI service responded with HTTP ${response.status}: ${errorText}`,
        );
      }

      const aiResult = (await response.json()) as AiInvestigationApiResponse;

      // 3. Persist final results and child records
      saved.status = aiResult.status || InvestigationStatus.COMPLETED;
      saved.summary = aiResult.summary ?? null;
      saved.rootCause = aiResult.rootCause ?? null;
      saved.confidence = aiResult.confidence ?? null;
      saved.confidenceFactors = aiResult.confidenceFactors ?? [];
      saved.error = aiResult.error ?? null;
      saved.completedAt = aiResult.completedAt ? new Date(aiResult.completedAt) : new Date();

      await this.investigationsRepository.save(saved);

      // Persist evidence records
      if (aiResult.evidence && aiResult.evidence.length > 0) {
        const evidenceEntities = aiResult.evidence.map((e) =>
          this.evidenceRepository.create({
            id: e.id,
            investigationId: saved.id,
            type: e.type as any,
            source: e.source,
            title: e.title,
            content: e.content,
            metadata: e.metadata ?? {},
            collectedAt: new Date(e.collectedAt),
          }),
        );
        await this.evidenceRepository.save(evidenceEntities);
      }

      // Persist hypotheses
      if (aiResult.hypotheses && aiResult.hypotheses.length > 0) {
        const hypEntities = aiResult.hypotheses.map((h) =>
          this.hypothesesRepository.create({
            id: h.id,
            investigationId: saved.id,
            description: h.description,
            confidence: h.confidence,
            status: h.status as any,
            supportingEvidenceIds: h.supportingEvidenceIds ?? [],
            contradictingEvidenceIds: h.contradictingEvidenceIds ?? [],
            reasoning: h.reasoning,
          }),
        );
        await this.hypothesesRepository.save(hypEntities);
      }

      // Persist recommendation
      if (aiResult.recommendation) {
        const r = aiResult.recommendation;
        const recEntity = this.recommendationRepository.create({
          id: r.id,
          investigationId: saved.id,
          action: r.action,
          reason: r.reason,
          riskLevel: r.riskLevel as any,
          confidence: r.confidence,
          requiresApproval: r.requiresApproval,
          mitigationSteps: r.mitigationSteps ?? [],
          remediationExecuted: r.remediationExecuted,
        });
        await this.recommendationRepository.save(recEntity);
      }

      // Persist agent runs
      if (aiResult.agentRuns && aiResult.agentRuns.length > 0) {
        const runEntities = aiResult.agentRuns.map((r) =>
          this.agentRunsRepository.create({
            investigationId: saved.id,
            agent: r.agent,
            status: r.status as any,
            startedAt: new Date(r.startedAt),
            completedAt: r.completedAt ? new Date(r.completedAt) : null,
            durationMs: r.durationMs ?? null,
            inputSummary: r.inputSummary ?? null,
            outputSummary: r.outputSummary ?? null,
            error: r.error ?? null,
            metadata: r.metadata ?? {},
          }),
        );
        await this.agentRunsRepository.save(runEntities);
      }

      void this.auditService.log({
        actorId: userId,
        action: AuditAction.INVESTIGATION_COMPLETED,
        resourceType: AuditResourceType.INVESTIGATION,
        resourceId: saved.id,
        metadata: {
          rootCause: saved.rootCause,
          confidence: saved.confidence,
          evidenceCount: aiResult.evidence?.length ?? 0,
        },
      });

      return (await this.findById(userId, saved.id))!;
    } catch (err: any) {
      this.logger.error(`Investigation ${saved.id} failed: ${err.message}`);
      saved.status = InvestigationStatus.FAILED;
      saved.error = err.message;
      saved.completedAt = new Date();
      await this.investigationsRepository.save(saved);

      void this.auditService.log({
        actorId: userId,
        action: AuditAction.INVESTIGATION_FAILED,
        resourceType: AuditResourceType.INVESTIGATION,
        resourceId: saved.id,
        metadata: { error: err.message },
      });

      throw new InternalServerErrorException({
        code: 'AI_INVESTIGATION_FAILED',
        message: `Investigation failed: ${err.message}`,
        investigationId: saved.id,
      });
    }
  }

  // ─── Query Methods ────────────────────────────────────────────────────────

  async findAllForIncident(
    userId: string,
    incidentId: string,
  ): Promise<Investigation[]> {
    await this.requireIncidentAccess(userId, incidentId);

    return this.investigationsRepository.find({
      where: { incidentId },
      relations: {
        recommendation: true,
      },
      order: { startedAt: 'DESC' },
    });
  }

  async findById(
    userId: string,
    investigationId: string,
  ): Promise<Investigation> {
    await this.requireInvestigationAccess(userId, investigationId);

    const inv = await this.investigationsRepository.findOne({
      where: { id: investigationId },
      relations: {
        evidence: true,
        hypotheses: true,
        recommendation: true,
        agentRuns: true,
      },
    });

    if (!inv) {
      throw new NotFoundException({
        code: 'INVESTIGATION_NOT_FOUND',
        message: 'Investigation not found.',
      });
    }

    return inv;
  }

  async getEvidence(
    userId: string,
    investigationId: string,
  ): Promise<InvestigationEvidence[]> {
    await this.requireInvestigationAccess(userId, investigationId);

    return this.evidenceRepository.find({
      where: { investigationId },
      order: { collectedAt: 'ASC' },
    });
  }

  async getHypotheses(
    userId: string,
    investigationId: string,
  ): Promise<InvestigationHypothesis[]> {
    await this.requireInvestigationAccess(userId, investigationId);

    return this.hypothesesRepository.find({
      where: { investigationId },
      order: { confidence: 'DESC' },
    });
  }

  async getRecommendation(
    userId: string,
    investigationId: string,
  ): Promise<InvestigationRecommendation | null> {
    await this.requireInvestigationAccess(userId, investigationId);

    return this.recommendationRepository.findOne({
      where: { investigationId },
    });
  }

  async getRuns(
    userId: string,
    investigationId: string,
  ): Promise<AgentRun[]> {
    await this.requireInvestigationAccess(userId, investigationId);

    return this.agentRunsRepository.find({
      where: { investigationId },
      order: { startedAt: 'ASC' },
    });
  }
}
