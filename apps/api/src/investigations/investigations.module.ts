import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Investigation } from './entities/investigation.entity.js';
import { InvestigationEvidence } from './entities/investigation-evidence.entity.js';
import { InvestigationHypothesis } from './entities/investigation-hypothesis.entity.js';
import { InvestigationRecommendation } from './entities/investigation-recommendation.entity.js';
import { AgentRun } from './entities/agent-run.entity.js';
import { Incident } from '../incidents/entities/incident.entity.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { InvestigationsService } from './investigations.service.js';
import {
  IncidentInvestigationsController,
  InvestigationDetailController,
} from './investigations.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Investigation,
      InvestigationEvidence,
      InvestigationHypothesis,
      InvestigationRecommendation,
      AgentRun,
      Incident,
    ]),
    ProjectsModule,
    AuditModule,
  ],
  controllers: [
    IncidentInvestigationsController,
    InvestigationDetailController,
  ],
  providers: [InvestigationsService],
  exports: [InvestigationsService],
})
export class InvestigationsModule {}
