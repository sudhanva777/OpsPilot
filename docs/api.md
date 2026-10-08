# OpsPilot API Reference

Base URL: `http://localhost:3001/api`

All authenticated endpoints require: `Authorization: Bearer <jwt-token>`

---

## Authentication

### Register

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "Jane Doe"
}
```

**Response** `201 Created`:
```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane Doe"
  }
}
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response** `200 OK`:
```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane Doe"
  }
}
```

### Get Current User

```http
GET /auth/me
Authorization: Bearer <token>
```

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Jane Doe",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "lastLoginAt": "2024-01-02T00:00:00.000Z"
}
```

---

## Projects

### List Projects

```http
GET /projects
Authorization: Bearer <token>
```

Returns only projects where the authenticated user is a member.

### Create Project

```http
POST /projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "E-Commerce Production",
  "description": "Main e-commerce platform"
}
```

**Response** `201 Created`

Creator is automatically added as OWNER.

### Get Project

```http
GET /projects/:id
Authorization: Bearer <token>
```

**403** if user is not a member of the project.

### Update Project

```http
PATCH /projects/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

---

## Incidents

### List Incidents for Project

```http
GET /projects/:projectId/incidents
Authorization: Bearer <token>
```

### Create Incident

```http
POST /projects/:projectId/incidents
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Payment API returning 500 errors",
  "description": "Customers unable to complete payments",
  "service": "payment-service",
  "severity": "CRITICAL"
}
```

**Severity values**: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

### Get Incident

```http
GET /incidents/:id
Authorization: Bearer <token>
```

### Update Incident

```http
PATCH /incidents/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated title",
  "severity": "HIGH",
  "assignedToId": "user-uuid"
}
```

### Change Incident Status

```http
POST /incidents/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "INVESTIGATING",
  "comment": "Starting investigation"
}
```

**Valid transitions**:

| From | To |
|------|-----|
| OPEN | INVESTIGATING, RESOLVED |
| INVESTIGATING | MITIGATED, RESOLVED, OPEN |
| MITIGATED | RESOLVED, INVESTIGATING |
| RESOLVED | CLOSED, INVESTIGATING |
| CLOSED | INVESTIGATING |

Invalid transitions return `400 Bad Request`.

### Get Incident Events

```http
GET /incidents/:id/events
Authorization: Bearer <token>
```

**Response** `200 OK`:
```json
[
  {
    "id": "uuid",
    "eventType": "INCIDENT_CREATED",
    "metadata": { "title": "...", "severity": "CRITICAL" },
    "actor": { "id": "uuid", "name": "Jane Doe" },
    "createdAt": "2024-01-01T10:02:00.000Z"
  },
  {
    "id": "uuid",
    "eventType": "STATUS_CHANGED",
    "metadata": { "from": "OPEN", "to": "INVESTIGATING" },
    "actor": { "id": "uuid", "name": "Jane Doe" },
    "createdAt": "2024-01-01T10:05:00.000Z"
  }
]
```

---

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "code": "ERROR_CODE",
  "message": "Human-readable description"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `EMAIL_ALREADY_EXISTS` | 409 | Registration with existing email |
| `PROJECT_NOT_FOUND` | 404 | Project doesn't exist |
| `INCIDENT_NOT_FOUND` | 404 | Incident doesn't exist |
| `ACCESS_DENIED` | 403 | User not a member of the project |
| `INVALID_INCIDENT_STATUS_TRANSITION` | 400 | Invalid status change |

---

## Health Check

```http
GET /health
```

**Response** `200 OK`:
```json
{
  "status": "ok",
  "service": "opspilot-api",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```
