import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { AuditService } from '../audit/audit.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AuditAction, AuditResourceType } from '../common/types/enums.js';
import { User } from '../users/entities/user.entity.js';

const BCRYPT_SALT_ROUNDS = 12;

export interface AuthTokenResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
  };
}

/**
 * AuthService — handles registration, login, and token issuance.
 *
 * Security notes:
 * - Passwords are hashed with bcrypt (12 rounds)
 * - JWT payload contains only id and email — no roles (authorization is checked at request time)
 * - Login errors are generic to prevent user enumeration
 * - auditService.log() is called but not awaited to avoid delaying the response
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async register(
    dto: RegisterDto,
    ipAddress?: string,
  ): Promise<AuthTokenResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check for duplicate email
    const existing = await this.usersService.findByEmailForAuth(normalizedEmail);
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email address already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const user = await this.usersService.create({
      email: normalizedEmail,
      passwordHash,
      name: dto.name,
    });

    this.logger.log(`User registered: ${user.id}`);

    void this.auditService.log({
      actorId: user.id,
      action: AuditAction.USER_REGISTERED,
      resourceType: AuditResourceType.USER,
      resourceId: user.id,
      ipAddress,
    });

    return this.buildTokenResponse(user);
  }

  async login(dto: LoginDto, ipAddress?: string): Promise<AuthTokenResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const user = await this.usersService.findByEmailForAuth(normalizedEmail);

    // Use constant-time comparison even on not-found to prevent timing attacks
    const passwordHash = user?.passwordHash ?? '$2b$12$invalidhashfortimingattack000';
    const isPasswordValid = await bcrypt.compare(dto.password, passwordHash);

    if (!user || !isPasswordValid) {
      void this.auditService.log({
        actorId: user?.id ?? null,
        action: AuditAction.USER_LOGIN,
        metadata: { success: false, email: normalizedEmail },
        ipAddress,
      });
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email address or password.',
      });
    }

    await this.usersService.updateLastLogin(user.id);

    void this.auditService.log({
      actorId: user.id,
      action: AuditAction.USER_LOGIN,
      resourceType: AuditResourceType.USER,
      resourceId: user.id,
      metadata: { success: true },
      ipAddress,
    });

    return this.buildTokenResponse(user);
  }

  private buildTokenResponse(user: User): AuthTokenResponse {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    };
  }
}
