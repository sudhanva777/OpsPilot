import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UsersService } from '../users/users.service.js';

interface JwtUser {
  id: string;
  email: string;
}

/**
 * AuthController — public and self-service auth endpoints.
 *
 * POST /auth/register   — create account
 * POST /auth/login      — authenticate, receive JWT
 * GET  /auth/me         — get authenticated user profile
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const ipAddress = req.ip ?? req.socket?.remoteAddress ?? null;
    return this.authService.register(dto, ipAddress ?? undefined);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip ?? req.socket?.remoteAddress ?? null;
    return this.authService.login(dto, ipAddress ?? undefined);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() currentUser: JwtUser) {
    const user = await this.usersService.findByIdOrFail(currentUser.id);
    // Return safe user object — never include passwordHash
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
