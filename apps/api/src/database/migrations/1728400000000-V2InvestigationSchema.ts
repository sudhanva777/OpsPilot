import { MigrationInterface, QueryRunner } from 'typeorm';

export class V2InvestigationSchema1728400000000 implements MigrationInterface {
  name = 'V2InvestigationSchema1728400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Enums ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "investigation_status_enum" AS ENUM (
        'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "evidence_type_enum" AS ENUM (
        'LOG', 'HEALTH', 'DATABASE', 'METRIC', 'DEPLOYMENT', 'CONFIGURATION'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "hypothesis_status_enum" AS ENUM (
        'PROPOSED', 'SUPPORTED', 'REJECTED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "risk_level_enum" AS ENUM (
        'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "agent_run_status_enum" AS ENUM (
        'PENDING', 'RUNNING', 'COMPLETED', 'FAILED'
      )
    `);

    await queryRunner.query(`
      ALTER TYPE "audit_resource_type_enum" ADD VALUE IF NOT EXISTS 'INVESTIGATION'
    `);
    await queryRunner.query(`
      ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'INVESTIGATION_STARTED'
    `);
    await queryRunner.query(`
      ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'INVESTIGATION_COMPLETED'
    `);
    await queryRunner.query(`
      ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'INVESTIGATION_FAILED'
    `);

    // ─── investigations ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "investigations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "incident_id" uuid NOT NULL,
        "status" "investigation_status_enum" NOT NULL DEFAULT 'PENDING',
        "started_at" timestamptz NOT NULL,
        "completed_at" timestamptz,
        "summary" text,
        "root_cause" text,
        "confidence" double precision,
        "confidence_factors" jsonb NOT NULL DEFAULT '[]',
        "error" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_investigations_incident"
          FOREIGN KEY ("incident_id")
          REFERENCES "incidents" ("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_investigations_incident_id" ON "investigations" ("incident_id")
    `);

    // ─── investigation_evidence ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "investigation_evidence" (
        "id" varchar(128) PRIMARY KEY,
        "investigation_id" uuid NOT NULL,
        "type" "evidence_type_enum" NOT NULL,
        "source" varchar(255) NOT NULL,
        "title" varchar(255) NOT NULL,
        "content" text NOT NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "collected_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_evidence_investigation"
          FOREIGN KEY ("investigation_id")
          REFERENCES "investigations" ("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_evidence_investigation_id" ON "investigation_evidence" ("investigation_id")
    `);

    // ─── investigation_hypotheses ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "investigation_hypotheses" (
        "id" varchar(128) PRIMARY KEY,
        "investigation_id" uuid NOT NULL,
        "description" text NOT NULL,
        "confidence" double precision NOT NULL,
        "status" "hypothesis_status_enum" NOT NULL,
        "supporting_evidence_ids" jsonb NOT NULL DEFAULT '[]',
        "contradicting_evidence_ids" jsonb NOT NULL DEFAULT '[]',
        "reasoning" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_hypotheses_investigation"
          FOREIGN KEY ("investigation_id")
          REFERENCES "investigations" ("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_hypotheses_investigation_id" ON "investigation_hypotheses" ("investigation_id")
    `);

    // ─── investigation_recommendations ───────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "investigation_recommendations" (
        "id" varchar(128) PRIMARY KEY,
        "investigation_id" uuid UNIQUE NOT NULL,
        "action" text NOT NULL,
        "reason" text NOT NULL,
        "risk_level" "risk_level_enum" NOT NULL,
        "confidence" double precision NOT NULL,
        "requires_approval" boolean NOT NULL DEFAULT true,
        "mitigation_steps" jsonb NOT NULL DEFAULT '[]',
        "remediation_executed" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_recommendations_investigation"
          FOREIGN KEY ("investigation_id")
          REFERENCES "investigations" ("id")
          ON DELETE CASCADE
      )
    `);

    // ─── agent_runs ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "agent_runs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "investigation_id" uuid NOT NULL,
        "agent" varchar(128) NOT NULL,
        "status" "agent_run_status_enum" NOT NULL DEFAULT 'PENDING',
        "started_at" timestamptz NOT NULL,
        "completed_at" timestamptz,
        "duration_ms" integer,
        "input_summary" text,
        "output_summary" text,
        "error" text,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_agent_runs_investigation"
          FOREIGN KEY ("investigation_id")
          REFERENCES "investigations" ("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_agent_runs_investigation_id" ON "agent_runs" ("investigation_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "agent_runs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "investigation_recommendations" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "investigation_hypotheses" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "investigation_evidence" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "investigations" CASCADE`);

    await queryRunner.query(`DROP TYPE IF EXISTS "agent_run_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "risk_level_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hypothesis_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "evidence_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "investigation_status_enum"`);
  }
}
