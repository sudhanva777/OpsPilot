import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { IncidentsModule } from './incidents/incidents.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

// Entities
import { User } from './users/entities/user.entity.js';
import { Project } from './projects/entities/project.entity.js';
import { ProjectMember } from './projects/entities/project-member.entity.js';
import { Incident } from './incidents/entities/incident.entity.js';
import { IncidentEvent } from './incidents/entities/incident-event.entity.js';
import { AuditLog } from './audit/entities/audit-log.entity.js';

@Module({
  imports: [
    // ─── Configuration ──────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      // Joi validation is handled manually in main.ts for cleaner startup errors
    }),

    // ─── Database ──────────────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('database.url'),
        entities: [User, Project, ProjectMember, Incident, IncidentEvent, AuditLog],
        // Migrations are run via CLI, not at startup
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: false,
        // synchronize: false in all environments — use migrations
        synchronize: false,
        logging: configService.get<string>('nodeEnv') === 'development',
        ssl:
          configService.get<string>('nodeEnv') === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),

    // ─── Feature Modules ────────────────────────────────────────────────────
    AuditModule,
    UsersModule,
    AuthModule,
    ProjectsModule,
    IncidentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
