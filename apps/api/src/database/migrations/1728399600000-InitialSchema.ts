import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * V1 Initial Schema Migration
 *
 * Creates the foundational OpsPilot V1 tables:
 * - users
 * - projects
 * - project_members
 * - incidents
 * - incident_events
 * - audit_logs
 *
 * The schema is designed to support V2 additions (investigations, evidence,
 * recommendations, remediations, postmortems) as new tables with FK references
 * to incidents and users without modifying this migration.
 */
export class InitialSchema1728399600000 implements MigrationInterface {
  name = 'InitialSchema1728399600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Enums ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "project_role_enum" AS ENUM ('OWNER', 'MEMBER')
    `);

    await queryRunner.query(`
      CREATE TYPE "incident_severity_enum" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
    `);

    await queryRunner.query(`
      CREATE TYPE "incident_status_enum" AS ENUM (
        'OPEN', 'INVESTIGATING', 'MITIGATED', 'RESOLVED', 'CLOSED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "incident_event_type_enum" AS ENUM (
        'INCIDENT_CREATED', 'INCIDENT_UPDATED', 'STATUS_CHANGED',
        'SEVERITY_CHANGED', 'ASSIGNEE_CHANGED', 'COMMENT_ADDED',
        'INCIDENT_RESOLVED', 'INCIDENT_CLOSED', 'INCIDENT_REOPENED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "audit_action_enum" AS ENUM (
        'USER_REGISTERED', 'USER_LOGIN', 'USER_LOGOUT',
        'PROJECT_CREATED', 'PROJECT_UPDATED', 'MEMBER_ADDED', 'MEMBER_REMOVED',
        'INCIDENT_CREATED', 'INCIDENT_UPDATED', 'INCIDENT_STATUS_CHANGED', 'INCIDENT_DELETED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "audit_resource_type_enum" AS ENUM (
        'USER', 'PROJECT', 'PROJECT_MEMBER', 'INCIDENT'
      )
    `);

    // ─── users ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"              UUID          NOT NULL DEFAULT gen_random_uuid(),
        "email"           VARCHAR(255)  NOT NULL,
        "password_hash"   VARCHAR(255)  NOT NULL,
        "name"            VARCHAR(255)  NOT NULL,
        "created_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "last_login_at"   TIMESTAMPTZ   DEFAULT NULL,
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);

    // ─── projects ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id"            UUID          NOT NULL DEFAULT gen_random_uuid(),
        "name"          VARCHAR(255)  NOT NULL,
        "slug"          VARCHAR(100)  NOT NULL,
        "description"   TEXT          DEFAULT NULL,
        "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "created_by_id" UUID          NOT NULL,
        CONSTRAINT "PK_projects" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_projects_slug" UNIQUE ("slug"),
        CONSTRAINT "FK_projects_created_by" FOREIGN KEY ("created_by_id")
          REFERENCES "users" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_projects_slug" ON "projects" ("slug")`);
    await queryRunner.query(`CREATE INDEX "IDX_projects_created_by" ON "projects" ("created_by_id")`);

    // ─── project_members ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "project_members" (
        "id"          UUID                NOT NULL DEFAULT gen_random_uuid(),
        "project_id"  UUID                NOT NULL,
        "user_id"     UUID                NOT NULL,
        "role"        "project_role_enum" NOT NULL DEFAULT 'MEMBER',
        "joined_at"   TIMESTAMPTZ         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_members" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_project_members_project_user" UNIQUE ("project_id", "user_id"),
        CONSTRAINT "FK_project_members_project" FOREIGN KEY ("project_id")
          REFERENCES "projects" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_members_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_project_members_project_user"
      ON "project_members" ("project_id", "user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_project_members_user"
      ON "project_members" ("user_id")
    `);

    // ─── incidents ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "incidents" (
        "id"               UUID                      NOT NULL DEFAULT gen_random_uuid(),
        "project_id"       UUID                      NOT NULL,
        "title"            VARCHAR(255)              NOT NULL,
        "description"      TEXT                      DEFAULT NULL,
        "service"          VARCHAR(100)              DEFAULT NULL,
        "severity"         "incident_severity_enum"  NOT NULL DEFAULT 'MEDIUM',
        "status"           "incident_status_enum"    NOT NULL DEFAULT 'OPEN',
        "created_by_id"    UUID                      NOT NULL,
        "assigned_to_id"   UUID                      DEFAULT NULL,
        "created_at"       TIMESTAMPTZ               NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ               NOT NULL DEFAULT now(),
        "resolved_at"      TIMESTAMPTZ               DEFAULT NULL,
        CONSTRAINT "PK_incidents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_incidents_project" FOREIGN KEY ("project_id")
          REFERENCES "projects" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_incidents_created_by" FOREIGN KEY ("created_by_id")
          REFERENCES "users" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_incidents_assigned_to" FOREIGN KEY ("assigned_to_id")
          REFERENCES "users" ("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_incidents_project_status" ON "incidents" ("project_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_incidents_project_severity" ON "incidents" ("project_id", "severity")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_incidents_created_at" ON "incidents" ("created_at" DESC)
    `);

    // ─── incident_events ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "incident_events" (
        "id"           UUID                         NOT NULL DEFAULT gen_random_uuid(),
        "incident_id"  UUID                         NOT NULL,
        "actor_id"     UUID                         DEFAULT NULL,
        "event_type"   "incident_event_type_enum"   NOT NULL,
        "metadata"     JSONB                        NOT NULL DEFAULT '{}',
        "created_at"   TIMESTAMPTZ                  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_incident_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_incident_events_incident" FOREIGN KEY ("incident_id")
          REFERENCES "incidents" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_incident_events_actor" FOREIGN KEY ("actor_id")
          REFERENCES "users" ("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_incident_events_incident_created"
      ON "incident_events" ("incident_id", "created_at")
    `);

    // ─── audit_logs ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id"             UUID                         NOT NULL DEFAULT gen_random_uuid(),
        "actor_id"       UUID                         DEFAULT NULL,
        "action"         "audit_action_enum"          NOT NULL,
        "resource_type"  "audit_resource_type_enum"   DEFAULT NULL,
        "resource_id"    UUID                         DEFAULT NULL,
        "metadata"       JSONB                        NOT NULL DEFAULT '{}',
        "ip_address"     VARCHAR(45)                  DEFAULT NULL,
        "created_at"     TIMESTAMPTZ                  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_actor_created"
      ON "audit_logs" ("actor_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_resource"
      ON "audit_logs" ("resource_type", "resource_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_action_created"
      ON "audit_logs" ("action", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "incident_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "incidents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "projects"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "audit_resource_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_action_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "incident_event_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "incident_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "incident_severity_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "project_role_enum"`);
  }
}
