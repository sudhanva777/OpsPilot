import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

// ─── bcrypt mock — must be BEFORE importing AuthService ──────────────────────
// auth.service.ts uses: import * as bcrypt from 'bcrypt'
// So we mock the module-level functions directly.
const mockBcrypt = {
  hash: vi.fn(),
  compare: vi.fn(),
};

vi.mock('bcrypt', () => mockBcrypt);

// ─── Import AFTER mock is registered ─────────────────────────────────────────
const { AuthService } = await import('./auth.service.js');

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  passwordHash: '$2b$12$validHashForTesting',
  name: 'Test User',
  createdAt: new Date(),
  lastLoginAt: null,
};

const mockUsersService = {
  findByEmailForAuth: vi.fn(),
  create: vi.fn(),
  updateLastLogin: vi.fn(),
};

const mockJwtService = {
  sign: vi.fn().mockReturnValue('mock-jwt-token'),
};

const mockAuditService = {
  log: vi.fn().mockResolvedValue(undefined),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let authService: InstanceType<typeof AuthService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBcrypt.hash.mockResolvedValue('$2b$12$hashedpassword');
    mockBcrypt.compare.mockResolvedValue(false);
    authService = new AuthService(
      mockUsersService as any,
      mockJwtService as any,
      mockAuditService as any,
    );
  });

  // ─── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('should register a new user and return an access token', async () => {
      mockUsersService.findByEmailForAuth.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(mockUsersService.create).toHaveBeenCalledOnce();
    });

    it('should normalize email to lowercase before checking for duplicates', async () => {
      mockUsersService.findByEmailForAuth.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      await authService.register({
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
        name: 'Test User',
      });

      expect(mockUsersService.findByEmailForAuth).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw ConflictException when email already exists', async () => {
      mockUsersService.findByEmailForAuth.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        }),
      ).rejects.toThrow(ConflictException);

      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('should log an audit event after successful registration', async () => {
      mockUsersService.findByEmailForAuth.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      await authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      // auditService.log is fire-and-forget (void), flush microtask queue
      await Promise.resolve();
      expect(mockAuditService.log).toHaveBeenCalledOnce();
    });
  });

  // ─── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('should return a token for valid credentials', async () => {
      mockUsersService.findByEmailForAuth.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockUsersService.findByEmailForAuth.mockResolvedValue(null);
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.login({ email: 'nobody@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockUsersService.findByEmailForAuth.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should normalize email before lookup', async () => {
      mockUsersService.findByEmailForAuth.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);

      await authService.login({ email: 'TEST@EXAMPLE.COM', password: 'password123' });

      expect(mockUsersService.findByEmailForAuth).toHaveBeenCalledWith('test@example.com');
    });

    it('should not update lastLogin on failed login', async () => {
      mockUsersService.findByEmailForAuth.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockUsersService.updateLastLogin).not.toHaveBeenCalled();
    });
  });
});
