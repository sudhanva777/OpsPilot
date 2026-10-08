# OpsPilot

> Autonomous Incident & Production Operations Platform

OpsPilot is a production-grade autonomous incident management and operations platform designed for SRE teams and DevOps engineers.

- **V1 Foundation**: User authentication, project membership, incident state machines, event timelines, and dark-mode Control Room UI.
- **V2 AI Investigation Engine**: Multi-domain telemetry collection, stateful LangGraph orchestration, specialized domain agents, competing hypotheses evaluation, evidence-backed RCA, and approval-gated remediation recommendations.

---

## Architecture

```text
React Control Room (apps/web)
             ↓
NestJS Product API (apps/api)
      ↓                   ↓
PostgreSQL         FastAPI AI Service (apps/ai)
                          ↓
                   LangGraph Engine
                          ↓
               6 Specialized Domain Agents
               (Logs, Health, DB, Metrics, Deploy, Config)
                          ↓
                  Hypotheses & RCA
                          ↓
               Groq Llama 3.3 Inference
```

---

## Tech Stack

### Frontend (`apps/web`)
- React 19 + TypeScript
- Vite
- React Router v7
- TanStack Query v5
- AI Investigation Control Room Component & Telemetry Radar

### Product Backend (`apps/api`)
- Node.js + NestJS 12
- TypeScript (strict mode, ESM)
- TypeORM + PostgreSQL
- JWT authentication (Passport.js)
- Investigation persistence & life-cycle orchestration

### AI Backend (`apps/ai`)
- Python 3.14 + FastAPI
- LangGraph 1.2+ stateful orchestration
- Groq (`llama-3.3-70b-versatile`) LLM inference
- 6 Specialized telemetry domain agents
- Controlled, audited investigation tools
- Deterministic simulation fixtures & scenario providers


---

## Repository Structure

```text
apps/
├── api/                    # NestJS backend
│   ├── src/
│   │   ├── auth/           # Authentication (register, login, JWT)
│   │   ├── users/          # User management
│   │   ├── projects/       # Project CRUD + membership
│   │   ├── incidents/      # Incident lifecycle + status machine
│   │   ├── audit/          # Audit logging
│   │   ├── common/         # Guards, filters, interceptors, types
│   │   ├── config/         # Configuration + validation
│   │   └── database/       # Migrations
│   └── ...
├── web/                    # React frontend
│   ├── src/
│   │   ├── app/            # Router configuration
│   │   ├── pages/          # Page components
│   │   ├── components/     # Layout, UI components
│   │   ├── hooks/          # Auth context
│   │   ├── services/api/   # Typed API client layer
│   │   ├── types/          # Domain models
│   │   └── utils/          # Formatting, display config
│   └── ...
└── docs/                   # Architecture documentation
```

---

## Local Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Git

### 1. Clone Repository

```bash
git clone <repo-url>
cd OpsPilot-Agent
```

### 2. Configure Environment

**Backend** — create `apps/api/.env` from the example:

```bash
cp apps/api/.env.example apps/api/.env
```

Edit the `.env` file:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opspilot
JWT_SECRET=your-secure-random-secret-here
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

**Frontend** — create `apps/web/.env`:

```bash
cp apps/web/.env.example apps/web/.env
```

### 3. Database Setup

```bash
# Create the database
createdb opspilot

# Run migrations
cd apps/api
npm run migration:run
```

### 4. Install Dependencies

```bash
# Backend
cd apps/api
npm install

# Frontend
cd apps/web
npm install
```

### 5. Start Development Servers

```bash
# Terminal 1 — Backend
cd apps/api
npm run start:dev

# Terminal 2 — Frontend
cd apps/web
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health check: http://localhost:3001/health

---

## API Overview

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Authenticate |
| GET | `/api/auth/me` | Get current user profile |

### Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project details |
| PATCH | `/api/projects/:id` | Update project |

### Incidents

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/:projectId/incidents` | List project incidents |
| POST | `/api/projects/:projectId/incidents` | Create incident |
| GET | `/api/incidents/:id` | Get incident details |
| PATCH | `/api/incidents/:id` | Update incident |
| POST | `/api/incidents/:id/status` | Change incident status |
| GET | `/api/incidents/:id/events` | Get incident timeline |

### Status Transitions

```text
OPEN → INVESTIGATING → MITIGATED → RESOLVED → CLOSED
  ↑                                    │         │
  └────────────────────────────────────┘─────────┘
                  (reopen)
```

---

## Security Model

- **Authentication**: JWT tokens via Authorization header
- **Password hashing**: bcrypt (10 salt rounds)
- **Authorization**: Server-side project membership verification on every request
- **Input validation**: class-validator DTOs with whitelist mode
- **CORS**: Configurable allowed origins
- **Audit logging**: All security-sensitive actions logged with actor ID
- **Token storage**: sessionStorage (tab-scoped, cleared on close)

---

## Testing

```bash
# Backend unit tests
cd apps/api
npm run test

# Frontend type check
cd apps/web
npx tsc --noEmit
```

---

## Roadmap

### V1 (Current) — Foundation
- [x] User authentication (register, login, JWT)
- [x] Project management with membership
- [x] Incident lifecycle with state machine
- [x] Incident timeline / events
- [x] Audit logging
- [x] Control room UI

### V2 — AI Investigation (Planned)
- [ ] `POST /incidents/:id/investigations`
- [ ] Python FastAPI agent service
- [ ] LangGraph investigation workflows
- [ ] Evidence collection
- [ ] Root cause analysis

### V3 — Remediation (Planned)
- [ ] Recommendation engine
- [ ] Human approval workflows
- [ ] Controlled remediation execution
- [ ] Automated verification

### V4 — Production Operations (Planned)
- [ ] GitHub integration
- [ ] Prometheus/Grafana observability
- [ ] AWS deployment (ECS, RDS)
- [ ] RBAC with fine-grained permissions
- [ ] Post-incident reporting

---

## License

Proprietary — Internal use only.
