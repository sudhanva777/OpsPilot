# OpsPilot Architecture

## System Overview

OpsPilot V2 architecture consists of three integrated services:

```text
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  React + Vite Control Room (apps/web)                  │  │
│  │  - Auth & Dashboard                                    │  │
│  │  - Incident Lifecycle & Timeline                       │  │
│  │  - AI Investigation Control Room                       │  │
│  └──────────────────────┬─────────────────────────────────┘  │
│                         │ REST + JWT                         │
│  ┌──────────────────────▼─────────────────────────────────┐  │
│  │  NestJS Product API (apps/api)                         │  │
│  │  - Auth & Authorization                                │  │
│  │  - Incidents & Projects                                │  │
│  │  - Investigation Lifecycle Persistence                 │  │
│  │  - Internal Service Dispatcher                         │  │
│  └──────────┬─────────────────────────────┬───────────────┘  │
│             │ TypeORM                     │ Internal Auth    │
│  ┌──────────▼──────────────┐   ┌──────────▼───────────────┐  │
│  │  PostgreSQL             │   │  FastAPI AI Layer        │  │
│  │  - users, projects      │   │  (apps/ai)               │  │
│  │  - incidents, events    │   │  - LangGraph Orchestrator│  │
│  │  - investigations       │   │  - 6 Domain Agents       │  │
│  │  - evidence, hypotheses │   │  - Controlled Tools      │  │
│  │  - recommendations      │   │  - RCA Engine            │  │
│  │  - agent_runs           │   │  - Groq LLM Inference    │  │
│  └─────────────────────────┘   └──────────────────────────┘  │
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

See [docs/frontend.md](file:///c:/sudhanva%20patil%20U/OpsPilot%20Agent/docs/frontend.md) for full design system and UI specifications.

```text
App
├── QueryClientProvider (TanStack Query)
├── AuthProvider (auth context)
└── RouterProvider
    ├── /login → LoginPage
    ├── /register → RegisterPage
    └── ProtectedRoute
        └── AppLayout (collapsible sidebar + topbar + command palette)
            ├── /dashboard → DashboardPage (system health & operations overview)
            ├── /incidents → IncidentsPage (global incident triage & filtering)
            ├── /incidents/:id → IncidentDetailPage (flagship SRE control room)
            ├── /projects → ProjectsPage (project catalog)
            └── /projects/:id → ProjectDetailPage (project telemetry & incidents)
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
