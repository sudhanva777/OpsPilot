import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, ConflictException } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import { ProjectRole } from '../common/types/enums.js';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockProjectsRepository = {
  findOne: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  save: vi.fn(),
};

const mockMembersRepository = {
  findOne: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  save: vi.fn(),
};

const mockAuditService = {
  log: vi.fn().mockResolvedValue(undefined),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ProjectsService', () => {
  let projectsService: ProjectsService;

  beforeEach(() => {
    vi.clearAllMocks();
    projectsService = new ProjectsService(
      mockProjectsRepository as any,
      mockMembersRepository as any,
      mockAuditService as any,
    );
  });

  // ─── requireMembership ─────────────────────────────────────────────────────

  describe('requireMembership', () => {
    it('should return membership when user is a project member', async () => {
      const membership = { id: 'mem-1', userId: 'user-1', projectId: 'project-1', role: ProjectRole.OWNER };
      mockMembersRepository.findOne.mockResolvedValue(membership);

      const result = await projectsService.requireMembership('user-1', 'project-1');
      expect(result).toEqual(membership);
    });

    it('should throw ForbiddenException when user is not a member', async () => {
      mockMembersRepository.findOne.mockResolvedValue(null);

      await expect(
        projectsService.requireMembership('user-A', 'project-B'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return 403 (not 404) to prevent project existence disclosure', async () => {
      mockMembersRepository.findOne.mockResolvedValue(null);

      try {
        await projectsService.requireMembership('user-A', 'project-B');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).getStatus()).toBe(403);
      }
    });
  });

  // ─── requireOwner ──────────────────────────────────────────────────────────

  describe('requireOwner', () => {
    it('should allow owners', async () => {
      const membership = { id: 'mem-1', userId: 'user-1', projectId: 'project-1', role: ProjectRole.OWNER };
      mockMembersRepository.findOne.mockResolvedValue(membership);

      await expect(projectsService.requireOwner('user-1', 'project-1')).resolves.not.toThrow();
    });

    it('should throw ForbiddenException for members who are not owners', async () => {
      const membership = { id: 'mem-2', userId: 'user-2', projectId: 'project-1', role: ProjectRole.MEMBER };
      mockMembersRepository.findOne.mockResolvedValue(membership);

      await expect(
        projectsService.requireOwner('user-2', 'project-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a project and make the creator an OWNER', async () => {
      const project = { id: 'proj-1', name: 'My Project', slug: 'my-project', createdById: 'user-1' };
      mockProjectsRepository.findOne.mockResolvedValue(null); // slug not taken
      mockProjectsRepository.create.mockReturnValue(project);
      mockProjectsRepository.save.mockResolvedValue(project);
      mockMembersRepository.create.mockReturnValue({ projectId: 'proj-1', userId: 'user-1', role: ProjectRole.OWNER });
      mockMembersRepository.save.mockResolvedValue({});

      const result = await projectsService.create('user-1', { name: 'My Project' });

      expect(result.id).toBe('proj-1');
      expect(mockMembersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', role: ProjectRole.OWNER }),
      );
    });

    it('should throw ConflictException when slug already exists', async () => {
      mockProjectsRepository.findOne.mockResolvedValue({ id: 'existing-project' });

      await expect(
        projectsService.create('user-1', { name: 'My Project' }),
      ).rejects.toThrow(ConflictException);

      expect(mockProjectsRepository.save).not.toHaveBeenCalled();
    });
  });

  // ─── Cross-user isolation ──────────────────────────────────────────────────

  describe('cross-user project isolation', () => {
    it('should not expose project data to non-members (user A cannot access user B projects)', async () => {
      // User A is not a member of User B's project
      mockMembersRepository.findOne.mockResolvedValue(null);

      await expect(
        projectsService.requireMembership('user-A', 'user-B-project'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
