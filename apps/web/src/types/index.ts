/**
 * Core domain types shared between API client and UI components.
 * Mirrors the backend entity shapes (minus passwordHash).
 */

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED' | 'CLOSED';
export type ProjectRole = 'OWNER' | 'MEMBER';

export type IncidentEventType =
  | 'INCIDENT_CREATED'
  | 'INCIDENT_UPDATED'
  | 'STATUS_CHANGED'
  | 'SEVERITY_CHANGED'
  | 'ASSIGNEE_CHANGED'
  | 'COMMENT_ADDED'
  | 'INCIDENT_RESOLVED'
  | 'INCIDENT_CLOSED'
  | 'INCIDENT_REOPENED';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
  };
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface ProjectMember {
  id: string;
  userId: string;
  role: ProjectRole;
  joinedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  members?: ProjectMember[];
}

export interface CreateProjectInput {
  name: string;
  slug?: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

// ─── Incidents ────────────────────────────────────────────────────────────────

export interface Incident {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  service: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  createdById: string;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  createdBy?: { id: string; name: string; email: string };
  assignedTo?: { id: string; name: string; email: string } | null;
}

export interface IncidentEvent {
  id: string;
  incidentId: string;
  actorId: string | null;
  eventType: IncidentEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor?: { id: string; name: string; email: string } | null;
}

export interface CreateIncidentInput {
  title: string;
  description?: string;
  service?: string;
  severity: IncidentSeverity;
  assignedToId?: string;
}

export interface UpdateIncidentInput {
  title?: string;
  description?: string;
  service?: string;
  severity?: IncidentSeverity;
  assignedToId?: string | null;
}

export interface ChangeIncidentStatusInput {
  status: IncidentStatus;
  comment?: string;
}

// ─── API Errors ───────────────────────────────────────────────────────────────

export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  timestamp: string;
}

// ─── Status transitions (mirrors backend state machine) ───────────────────────

export const VALID_STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  OPEN: ['INVESTIGATING', 'RESOLVED'],
  INVESTIGATING: ['MITIGATED', 'RESOLVED', 'OPEN'],
  MITIGATED: ['RESOLVED', 'INVESTIGATING'],
  RESOLVED: ['CLOSED', 'INVESTIGATING'],
  CLOSED: ['INVESTIGATING'],
};
