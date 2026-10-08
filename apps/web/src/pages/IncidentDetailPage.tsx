import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { incidentsApi } from '../services/api/incidentsApi';
import { InvestigationControlRoom } from '../components/investigation/InvestigationControlRoom';
import {
  SEVERITY_CONFIG,
  STATUS_CONFIG,
  timeAgo,
  formatDate,
  formatTime,
  getErrorMessage,
} from '../utils';
import { VALID_STATUS_TRANSITIONS } from '../types';
import type { IncidentStatus, IncidentEvent } from '../types';

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();


  const {
    data: incident,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['incident', id],
    queryFn: () => incidentsApi.getById(id!),
    enabled: !!id,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['incident-events', id],
    queryFn: () => incidentsApi.getEvents(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner" />
          Loading incident...
        </div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="page-container">
        <div className="error-container">
          <h3>Unable to load incident</h3>
          <p>{error ? getErrorMessage(error) : 'Incident not found'}</p>
          <button className="btn btn-primary" onClick={() => navigate(-1)}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const sevConfig = SEVERITY_CONFIG[incident.severity];
  const statusConfig = STATUS_CONFIG[incident.status];
  const validTransitions = VALID_STATUS_TRANSITIONS[incident.status] || [];

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/projects')}>
          Projects
        </span>
        {' / '}
        <span
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(`/projects/${incident.projectId}`)}
        >
          Project
        </span>
        {' / '}
        <span>Incident</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span className={`badge badge-${incident.severity.toLowerCase()}`}>
            {sevConfig.icon} {sevConfig.label}
          </span>
          <span className={`badge badge-${incident.status.toLowerCase()}`}>
            {statusConfig.label}
          </span>
        </div>
        <h1 className="page-title" style={{ marginTop: '8px' }}>
          {incident.title}
        </h1>
      </div>

      {/* Main Grid: Content + Sidebar */}
      <div className="incident-detail-grid">
        {/* Left Column: Main content */}
        <div>
          {/* Description */}
          {incident.description && (
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="card-header">
                <h3>Description</h3>
              </div>
              <div className="card-body">
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {incident.description}
                </p>
              </div>
            </div>
          )}

          {/* AI Investigation Engine Control Room */}
          <InvestigationControlRoom incident={incident} />

          {/* Timeline */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h3>Timeline</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {events.length} event{events.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="card-body">
              {events.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>
                  No events recorded yet.
                </div>
              ) : (
                <div className="timeline">
                  {events
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                    )
                    .map((event) => (
                      <TimelineItem key={event.id} event={event} />
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Right Column: Metadata & Actions */}
        <div>
          {/* Metadata */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-header">
              <h3>Details</h3>
            </div>
            <div className="card-body">
              <div className="incident-meta-grid">
                <div className="incident-meta-item">
                  <div className="incident-meta-label">Status</div>
                  <div className="incident-meta-value">
                    <span className={`badge badge-${incident.status.toLowerCase()}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
                <div className="incident-meta-item">
                  <div className="incident-meta-label">Severity</div>
                  <div className="incident-meta-value">
                    <span className={`badge badge-${incident.severity.toLowerCase()}`}>
                      {sevConfig.icon} {sevConfig.label}
                    </span>
                  </div>
                </div>
                <div className="incident-meta-item">
                  <div className="incident-meta-label">Service</div>
                  <div className="incident-meta-value mono">
                    {incident.service || '—'}
                  </div>
                </div>
                <div className="incident-meta-item">
                  <div className="incident-meta-label">Created</div>
                  <div className="incident-meta-value">
                    {timeAgo(incident.createdAt)}
                  </div>
                </div>
                <div className="incident-meta-item">
                  <div className="incident-meta-label">Created By</div>
                  <div className="incident-meta-value">
                    {incident.createdBy?.name || '—'}
                  </div>
                </div>
                <div className="incident-meta-item">
                  <div className="incident-meta-label">Assigned To</div>
                  <div className="incident-meta-value">
                    {incident.assignedTo?.name || 'Unassigned'}
                  </div>
                </div>
                {incident.resolvedAt && (
                  <div className="incident-meta-item" style={{ gridColumn: '1 / -1' }}>
                    <div className="incident-meta-label">Resolved At</div>
                    <div className="incident-meta-value">
                      {formatDate(incident.resolvedAt)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <div className="card-header">
              <h3>Actions</h3>
            </div>
            <div className="card-body">
              {validTransitions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {validTransitions.map((status) => {
                    const cfg = STATUS_CONFIG[status];
                    return (
                      <StatusTransitionButton
                        key={status}
                        incidentId={incident.id}
                        targetStatus={status}
                        label={`Move to ${cfg.label}`}
                        onSuccess={() => {
                          queryClient.invalidateQueries({ queryKey: ['incident', id] });
                          queryClient.invalidateQueries({ queryKey: ['incident-events', id] });
                        }}
                      />
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No available status transitions.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusTransitionButton({
  incidentId,
  targetStatus,
  label,
  onSuccess,
}: {
  incidentId: string;
  targetStatus: IncidentStatus;
  label: string;
  onSuccess: () => void;
}) {
  const mutation = useMutation({
    mutationFn: () => incidentsApi.changeStatus(incidentId, { status: targetStatus }),
    onSuccess,
  });

  const cfg = STATUS_CONFIG[targetStatus];

  return (
    <button
      className="btn btn-secondary"
      style={{
        borderColor: cfg.color,
        color: cfg.color,
        width: '100%',
        justifyContent: 'center',
      }}
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? 'Updating...' : label}
    </button>
  );
}

function TimelineItem({ event }: { event: IncidentEvent }) {
  const dotClass = getDotClass(event.eventType);
  const description = getEventDescription(event);

  return (
    <div className="timeline-item">
      <div className={`timeline-dot ${dotClass}`} />
      <div className="timeline-time">{formatTime(event.createdAt)}</div>
      <div className="timeline-content">
        {event.actor && <span className="timeline-actor">{event.actor.name}</span>}{' '}
        {description}
      </div>
    </div>
  );
}

function getDotClass(eventType: string): string {
  if (eventType.includes('STATUS')) return 'status';
  if (eventType.includes('SEVERITY')) return 'severity';
  if (eventType.includes('CREATED')) return 'create';
  if (eventType.includes('CLOSED')) return 'close';
  return '';
}

function getEventDescription(event: IncidentEvent): string {
  const meta = event.metadata as Record<string, string>;
  switch (event.eventType) {
    case 'INCIDENT_CREATED':
      return 'created this incident';
    case 'STATUS_CHANGED':
      return `changed status from ${meta.from || '?'} to ${meta.to || '?'}`;
    case 'SEVERITY_CHANGED':
      return `changed severity from ${meta.from || '?'} to ${meta.to || '?'}`;
    case 'ASSIGNEE_CHANGED':
      return `assigned to ${meta.assigneeName || 'someone'}`;
    case 'INCIDENT_UPDATED':
      return 'updated the incident';
    case 'COMMENT_ADDED':
      return `commented: "${meta.comment || ''}"`;
    case 'INCIDENT_RESOLVED':
      return 'resolved this incident';
    case 'INCIDENT_CLOSED':
      return 'closed this incident';
    case 'INCIDENT_REOPENED':
      return 'reopened this incident';
    default:
      return String(event.eventType).toLowerCase().replace(/_/g, ' ');
  }

}
