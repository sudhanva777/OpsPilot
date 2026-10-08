import { Controller, Get } from '@nestjs/common';

/**
 * AppController — application-level endpoints.
 *
 * GET /health — used by load balancers, uptime monitors, and the frontend
 *              to verify the API is reachable.
 */
@Controller()
export class AppController {
  @Get('health')
  health(): { status: string; service: string; timestamp: string } {
    return {
      status: 'ok',
      service: 'opspilot-api',
      timestamp: new Date().toISOString(),
    };
  }
}
