import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard — protects endpoints requiring a valid JWT.
 *
 * Apply at controller or route level:
 *   @UseGuards(JwtAuthGuard)
 *
 * Returns 401 Unauthorized if token is missing or invalid.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
