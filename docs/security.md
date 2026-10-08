# OpsPilot Security Model

## Authentication

### JWT Token Flow

```text
Client                          Server
  │                               │
  ├── POST /auth/login ──────────►│
  │   { email, password }         │
  │                               ├── Validate credentials
  │                               ├── Hash comparison (bcrypt)
  │                               ├── Generate JWT
  │◄── { token, user } ──────────┤
  │                               │
  ├── GET /projects ─────────────►│
  │   Authorization: Bearer <jwt> │
  │                               ├── JwtAuthGuard validates token
  │                               ├── Extract userId from payload
  │◄── { projects } ─────────────┤
```

### Password Security

- **Algorithm**: bcrypt with 10 salt rounds
- **Storage**: Only the hash is stored (`password_hash` column)
- **API Response**: `passwordHash` is NEVER included in any API response
- **Validation**: Minimum 8 characters required at registration

### Token Storage (Frontend)

- **Location**: `sessionStorage` (tab-scoped)
- **Rationale**: Cleared when tab closes, not accessible across tabs
- **XSS Note**: While no browser storage is fully XSS-proof, `sessionStorage` limits exposure vs `localStorage`
- **Future**: V2+ may introduce httpOnly cookies or token rotation

## Authorization

### Project Membership Model

Every project access goes through membership verification:

```text
Request with JWT
    ↓
Extract userId from token
    ↓
Query project_members WHERE userId AND projectId
    ↓
Membership exists? → Proceed
No membership? → 403 Forbidden
```

### Authorization Rules

| Action | Rule |
|--------|------|
| List projects | Only projects where user is a member |
| View project | Membership required |
| Update project | Membership required (OWNER for V2 restrictions) |
| Create incident | Membership in target project |
| View incident | Membership in incident's project |
| Update incident | Membership in incident's project |
| Change status | Membership in incident's project |
| View events | Membership in incident's project |

### IDOR Prevention

- No endpoint returns data based solely on resource ID
- Server always cross-references the authenticated user's memberships
- Client-provided `userId` is never trusted — always extracted from JWT

## Input Validation

- All DTOs validated via `class-validator` decorators
- `ValidationPipe` with `whitelist: true` strips unknown properties
- `forbidNonWhitelisted: true` rejects requests with unexpected fields
- SQL injection prevented by TypeORM parameterized queries

## Audit Trail

All security-sensitive actions are logged to `audit_logs` table:

- Login attempts (success/failure)
- Account creation
- Project creation/updates
- Incident lifecycle changes
- Membership changes

Audit records include: `actorId`, `action`, `resourceType`, `resourceId`, `metadata`, `ipAddress`, `timestamp`

## Error Handling

- Stack traces are NOT exposed in production responses
- Database errors are caught and returned as generic 500s
- Structured error codes are returned (e.g., `INVALID_CREDENTIALS`, `INCIDENT_NOT_FOUND`)
- No secrets, paths, or SQL in error responses

## Environment Security

- All secrets via environment variables (never in code)
- `.env` files in `.gitignore`
- `.env.example` files committed with placeholder values
- CORS configured via `CORS_ORIGIN` env var
