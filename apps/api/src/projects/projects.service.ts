import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity.js';
import { ProjectMember } from './entities/project-member.entity.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { AuditService } from '../audit/audit.service.js';
import {
  AuditAction,
  AuditResourceType,
  ProjectRole,
} from '../common/types/enums.js';

/**
 * ProjectsService — project management and membership authorization.
 *
 * Authorization contract:
 * - Every method that accesses project data verifies membership first.
 * - No project is returned based on ID alone.
 * - Authorization is done server-side, never trusting client claims.
 */
@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly membersRepository: Repository<ProjectMember>,
    private readonly auditService: AuditService,
  ) {}

  // ─── Authorization helpers ────────────────────────────────────────────────

  async getMembership(
    userId: string,
    projectId: string,
  ): Promise<ProjectMember | null> {
    return this.membersRepository.findOne({
      where: { userId, projectId },
    });
  }

  async requireMembership(
    userId: string,
    projectId: string,
  ): Promise<ProjectMember> {
    const membership = await this.getMembership(userId, projectId);
    if (!membership) {
      // Return 403 rather than 404 — don't reveal project existence to non-members
      throw new ForbiddenException({
        code: 'PROJECT_ACCESS_DENIED',
        message: 'You do not have access to this project.',
      });
    }
    return membership;
  }

  async requireOwner(userId: string, projectId: string): Promise<void> {
    const membership = await this.requireMembership(userId, projectId);
    if (membership.role !== ProjectRole.OWNER) {
      throw new ForbiddenException({
        code: 'PROJECT_OWNER_REQUIRED',
        message: 'Only project owners can perform this action.',
      });
    }
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateProjectDto): Promise<Project> {
    const slug = dto.slug ?? this.generateSlug(dto.name);

    // Check slug uniqueness
    const existing = await this.projectsRepository.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException({
        code: 'PROJECT_SLUG_EXISTS',
        message: `A project with slug "${slug}" already exists.`,
      });
    }

    const project = this.projectsRepository.create({
      name: dto.name.trim(),
      slug,
      description: dto.description?.trim() ?? null,
      createdById: userId,
    });

    const savedProject = await this.projectsRepository.save(project);

    // Creator automatically becomes OWNER
    const membership = this.membersRepository.create({
      projectId: savedProject.id,
      userId,
      role: ProjectRole.OWNER,
    });
    await this.membersRepository.save(membership);

    this.logger.log(`Project created: ${savedProject.id} by user ${userId}`);

    void this.auditService.log({
      actorId: userId,
      action: AuditAction.PROJECT_CREATED,
      resourceType: AuditResourceType.PROJECT,
      resourceId: savedProject.id,
      metadata: { name: savedProject.name, slug: savedProject.slug },
    });

    return savedProject;
  }

  async findAllForUser(userId: string): Promise<Project[]> {
    // Return only projects the user is a member of
    const memberships = await this.membersRepository.find({
      where: { userId },
      relations: { project: true },
    });
    return memberships.map((m) => m.project);
  }

  async findByIdForUser(userId: string, projectId: string): Promise<Project> {
    await this.requireMembership(userId, projectId);

    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: { createdBy: true, members: { user: true } },
    });

    if (!project) {
      throw new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found.',
      });
    }

    return project;
  }

  async update(
    userId: string,
    projectId: string,
    dto: UpdateProjectDto,
  ): Promise<Project> {
    await this.requireMembership(userId, projectId);

    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found.' });
    }

    if (dto.name) project.name = dto.name.trim();
    if (dto.description !== undefined) project.description = dto.description?.trim() ?? null;

    const updated = await this.projectsRepository.save(project);

    void this.auditService.log({
      actorId: userId,
      action: AuditAction.PROJECT_UPDATED,
      resourceType: AuditResourceType.PROJECT,
      resourceId: projectId,
      metadata: { changes: dto },
    });

    return updated;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  }
}
