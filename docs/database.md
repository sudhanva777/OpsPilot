# OpsPilot Database Schema

## V1 Tables

### `users`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, auto-generated |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL |
| `password_hash` | VARCHAR(255) | NOT NULL |
| `name` | VARCHAR(255) | NOT NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `last_login_at` | TIMESTAMPTZ | NULLABLE |

### `projects`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, auto-generated |
| `name` | VARCHAR(255) | NOT NULL |
| `slug` | VARCHAR(255) | UNIQUE, NOT NULL |
| `description` | TEXT | NULLABLE |
| `created_by_id` | UUID | FK → users.id |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |

### `project_members`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, auto-generated |
| `user_id` | UUID | FK → users.id, NOT NULL |
| `project_id` | UUID | FK → projects.id, NOT NULL |
| `role` | ENUM | 'OWNER', 'MEMBER' |
| `joined_at` | TIMESTAMPTZ | DEFAULT NOW() |

**Unique constraint**: `(user_id, project_id)`

### `incidents`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, auto-generated |
| `project_id` | UUID | FK → projects.id, NOT NULL |
| `title` | VARCHAR(500) | NOT NULL |
| `description` | TEXT | NULLABLE |
| `service` | VARCHAR(255) | NULLABLE |
| `severity` | ENUM | LOW, MEDIUM, HIGH, CRITICAL |
| `status` | ENUM | OPEN, INVESTIGATING, MITIGATED, RESOLVED, CLOSED |
| `created_by_id` | UUID | FK → users.id |
| `assigned_to_id` | UUID | FK → users.id, NULLABLE |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `resolved_at` | TIMESTAMPTZ | NULLABLE |

### `incident_events`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, auto-generated |
| `incident_id` | UUID | FK → incidents.id, NOT NULL |
| `actor_id` | UUID | FK → users.id, NULLABLE |
| `event_type` | VARCHAR(100) | NOT NULL |
| `metadata` | JSONB | DEFAULT '{}' |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

### `audit_logs`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, auto-generated |
| `actor_id` | UUID | FK → users.id, NULLABLE |
| `action` | VARCHAR(100) | NOT NULL |
| `resource_type` | VARCHAR(100) | NOT NULL |
| `resource_id` | VARCHAR(255) | NULLABLE |
| `metadata` | JSONB | DEFAULT '{}' |
| `ip_address` | VARCHAR(45) | NULLABLE |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

## V2 Extensions (Planned)

These tables can be added without modifying V1 schema:

```text
investigations        → FK to incidents.id
investigation_runs    → FK to investigations.id
evidence              → FK to investigations.id
recommendations       → FK to investigations.id
remediations          → FK to recommendations.id
verification_runs     → FK to remediations.id
postmortems           → FK to incidents.id
agent_runs            → FK to investigation_runs.id
tool_calls            → FK to agent_runs.id
```

## Migrations

Migrations are managed via TypeORM CLI:

```bash
# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Generate migration from entity changes
npm run migration:generate -- src/database/migrations/MigrationName
```
