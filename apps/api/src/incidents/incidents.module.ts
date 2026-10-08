import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Incident } from './entities/incident.entity.js';
import { IncidentEvent } from './entities/incident-event.entity.js';
import { IncidentsService } from './incidents.service.js';
import {
  IncidentsController,
  ProjectIncidentsController,
  IncidentDetailController,
} from './incidents.controller.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Incident, IncidentEvent]),
    ProjectsModule,
    AuditModule,
  ],
  controllers: [
    ProjectIncidentsController,
    IncidentDetailController,
  ],
  providers: [IncidentsService, IncidentsController],
})
export class IncidentsModule {}
