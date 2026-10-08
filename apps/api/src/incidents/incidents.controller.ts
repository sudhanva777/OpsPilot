import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { IncidentsService } from './incidents.service.js';
import { CreateIncidentDto } from './dto/create-incident.dto.js';
import { UpdateIncidentDto } from './dto/update-incident.dto.js';
import { ChangeIncidentStatusDto } from './dto/change-incident-status.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

interface JwtUser {
  id: string;
  email: string;
}

/**
 * IncidentsController — thin controller over IncidentsService.
 *
 * Two endpoint groups:
 * 1. Project-scoped: /projects/:projectId/incidents — list and create
 * 2. Incident-scoped: /incidents/:id — detail, update, status, events
 *
 * Authorization is always verified inside the service via project membership.
 */
@UseGuards(JwtAuthGuard)
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  // ─── Project-scoped routes (registered in ProjectsModule routing) ─────────

  createForProject(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateIncidentDto,
  ) {
    return this.incidentsService.create(user.id, projectId, dto);
  }

  listForProject(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.incidentsService.findAllForProject(user.id, projectId);
  }

  // ─── Incident-scoped routes ────────────────────────────────────────────────

  findOne(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.incidentsService.findById(user.id, id);
  }

  update(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentDto,
  ) {
    return this.incidentsService.update(user.id, id, dto);
  }

  changeStatus(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeIncidentStatusDto,
  ) {
    return this.incidentsService.changeStatus(user.id, id, dto);
  }

  getEvents(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.incidentsService.getEvents(user.id, id);
  }
}

/**
 * ProjectIncidentsController — handles routes nested under /projects/:projectId
 */
@Controller('projects/:projectId/incidents')
@UseGuards(JwtAuthGuard)
export class ProjectIncidentsController {
  constructor(private readonly incidentsController: IncidentsController) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateIncidentDto,
  ) {
    return this.incidentsController.createForProject(user, projectId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.incidentsController.listForProject(user, projectId);
  }
}

/**
 * IncidentDetailController — handles routes for individual incidents
 */
@Controller('incidents')
@UseGuards(JwtAuthGuard)
export class IncidentDetailController {
  constructor(private readonly incidentsController: IncidentsController) {}

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.incidentsController.findOne(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentDto,
  ) {
    return this.incidentsController.update(user, id, dto);
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  changeStatus(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeIncidentStatusDto,
  ) {
    return this.incidentsController.changeStatus(user, id, dto);
  }

  @Get(':id/events')
  getEvents(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.incidentsController.getEvents(user, id);
  }
}
