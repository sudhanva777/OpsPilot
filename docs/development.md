# OpsPilot Development Guide

## Prerequisites

- Node.js 20+ (`node --version`)
- PostgreSQL 14+ (`psql --version`)
- Git (`git --version`)

## Quick Start

```bash
# 1. Clone and enter the repo
git clone <repo-url> && cd OpsPilot-Agent

# 2. Setup backend
cd apps/api
cp .env.example .env           # Edit with your DB credentials
npm install
npm run migration:run           # Create tables

# 3. Setup frontend
cd ../web
cp .env.example .env
npm install

# 4. Start both servers
# Terminal 1:
cd apps/api && npm run start:dev

# Terminal 2:
cd apps/web && npm run dev
```

## Environment Variables

### Backend (`apps/api/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3001` | API server port |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | — | Secret for JWT signing |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiration |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin |

### Frontend (`apps/web/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `http://localhost:3001/api` | Backend API URL |

## Database Management

```bash
cd apps/api

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Generate new migration from entity changes
npm run migration:generate -- src/database/migrations/DescriptiveName
```

## Running Tests

```bash
# Backend unit tests
cd apps/api
npm run test

# Backend e2e tests
npm run test:e2e

# Frontend type check
cd apps/web
npx tsc --noEmit
```

## Code Quality

```bash
# Lint (backend)
cd apps/api
npm run lint

# Format (backend)
npx prettier --write "src/**/*.ts"
```

## Project Structure Conventions

### Backend

- **Controllers**: Thin HTTP layer, delegate to services
- **Services**: Business logic, authorization checks
- **DTOs**: Input validation with class-validator decorators
- **Entities**: TypeORM entities with proper column types
- **Modules**: NestJS modules group related functionality

### Frontend

- **Pages**: Top-level route components
- **Components**: Reusable UI elements
- **Services/API**: Typed Axios client layer
- **Hooks**: Shared React hooks (auth context)
- **Types**: Shared TypeScript interfaces
- **Utils**: Formatting, display configuration

## Git Conventions

Commit messages follow conventional commits:

```text
feat(scope): description     # New feature
fix(scope): description      # Bug fix
refactor(scope): description # Code change that neither fixes nor adds
test(scope): description     # Adding tests
docs(scope): description     # Documentation
chore(scope): description    # Tooling, config
```

Scopes: `api`, `web`, `db`, `auth`, `projects`, `incidents`
