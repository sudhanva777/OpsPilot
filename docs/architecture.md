# OpsPilot Architecture

## System Overview

OpsPilot V1 is a monorepo containing two applications:

```text
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  React + Vite (apps/web)                              │  │
│  │  - Auth pages (login, register)                       │  │
│  │  - Dashboard                                          │  │
│  │  - Projects & Incidents                               │  │
│  └──────────────────────┬─────────────────────────────────┘  │
│                         │ REST + JWT                         │
│  ┌──────────────────────▼─────────────────────────────────┐  │
│  │  NestJS API (apps/api)                                │  │
│  │  - Controllers (thin HTTP layer)                      │  │
│  │  - Services (business logic)                          │  │
│  │  - Guards (auth enforcement)                          │  │
│  │  - TypeORM entities + repositories                    │  │
│  └──────────────────────┬─────────────────────────────────┘  │
│                         │ TypeORM                            │
│  ┌──────────────────────▼─────────────────────────────────┐  │
│  │  PostgreSQL                                           │  │
│  │  - users, projects, project_members                   │  │
│  │  - incidents, incident_events, audit_logs             │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Backend Architecture

### Request Flow

```text
HTTP Request
    ↓
Global Exception Filter (catches all errors)
    ↓
Logging Interceptor (request/response timing)
    ↓
Controller (route handling)
    ↓
ValidationPipe (DTO validation via class-validator)
    ↓
JwtAuthGuard (authentication check)
    ↓
Service Layer (business logic + authorization)
    ↓
TypeORM Repository (database queries)
    ↓
PostgreSQL
```

### Module Structure

```text
AppModule
├── ConfigModule (environment configuration)
├── TypeOrmModule (database connection)
├── AuthModule
│   ├── AuthController (register, login, me)
│   ├── AuthService (JWT generation, password hashing)
│   └── JwtStrategy (Passport.js JWT validation)
├── UsersModule
│   └── UsersService (user CRUD)
├── ProjectsModule
│   ├── ProjectsController (project + membership endpoints)
│   └── ProjectsService (project logic + auth checks)
├── IncidentsModule
│   ├── IncidentsController (incident CRUD + status)
│   └── IncidentsService (lifecycle + state machine)
└── AuditModule
    └── AuditService (fire-and-forget audit logging)
```

### Authorization Model

Every project/incident request follows this flow:

```text
1. Extract userId from JWT (JwtAuthGuard)
2. Service method receives userId
3. Service queries project_members table
4. If membership exists → proceed
5. If not → throw ForbiddenException
```

This prevents IDOR vulnerabilities by never trusting client-provided project ownership.

## Frontend Architecture

### Component Hierarchy

```text
App
├── QueryClientProvider (TanStack Query)
├── AuthProvider (auth context)
└── RouterProvider
    ├── /login → LoginPage
    ├── /register → RegisterPage
    └── ProtectedRoute
        └── AppLayout (sidebar + content)
            ├── /dashboard → DashboardPage
            ├── /projects → ProjectsPage
            ├── /projects/:id → ProjectDetailPage
            └── /incidents/:id → IncidentDetailPage
```

### Data Flow

```text
Page Component
    ↓ useQuery / useMutation
TanStack Query
    ↓ queryFn
API Client (services/api/)
    ↓ axios
Backend API
```

## V2 Integration Points

The incident detail page contains a placeholder section for AI investigation.
V2 will introduce:

```text
POST /incidents/:id/investigations
```

The NestJS backend will proxy investigation requests to:

```text
Python FastAPI Agent Service
    ↓
LangGraph Workflow
    ↓
Tool Calls (metrics, logs, code analysis)
    ↓
Investigation Results
```

No changes to V1 domain models are needed to support this.
