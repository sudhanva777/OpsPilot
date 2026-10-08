import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { InvestigationsService } from './investigations.service.js';
import { StartInvestigationDto } from './dto/start-investigation.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

interface JwtUser {
  id: string;
  email: string;
}

/**
 * Controller for incident-scoped investigation endpoints:
 *   POST /api/incidents/:incidentId/investigations
 *   GET  /api/incidents/:incidentId/investigations
 */
@Controller('incidents/:incidentId/investigations')
@UseGuards(JwtAuthGuard)
export class IncidentInvestigationsController {
  constructor(private readonly investigationsService: InvestigationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  startInvestigation(
    @CurrentUser() user: JwtUser,
    @Param('incidentId', ParseUUIDPipe) incidentId: string,
    @Body() dto: StartInvestigationDto,
  ) {
    return this.investigationsService.startInvestigation(user.id, incidentId, dto);
  }

  @Get()
  listForIncident(
    @CurrentUser() user: JwtUser,
    @Param('incidentId', ParseUUIDPipe) incidentId: string,
  ) {
    return this.investigationsService.findAllForIncident(user.id, incidentId);
  }
}

/**
 * Controller for investigation-scoped queries:
 *   GET /api/investigations/:id
 *   GET /api/investigations/:id/evidence
 *   GET /api/investigations/:id/hypotheses
 *   GET /api/investigations/:id/recommendation
 *   GET /api/investigations/:id/runs
 */
@Controller('investigations')
@UseGuards(JwtAuthGuard)
export class InvestigationDetailController {
  constructor(private readonly investigationsService: InvestigationsService) {}

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.investigationsService.findById(user.id, id);
  }

  @Get(':id/evidence')
  getEvidence(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.investigationsService.getEvidence(user.id, id);
  }

  @Get(':id/hypotheses')
  getHypotheses(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.investigationsService.getHypotheses(user.id, id);
  }

  @Get(':id/recommendation')
  getRecommendation(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.investigationsService.getRecommendation(user.id, id);
  }

  @Get(':id/runs')
  getRuns(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.investigationsService.getRuns(user.id, id);
  }
}
