import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../services/api/projectsApi';
import { incidentsApi } from '../services/api/incidentsApi';
import { SEVERITY_CONFIG, STATUS_CONFIG, timeAgo, getErrorMessage } from '../utils';
import type { CreateIncidentInput, IncidentSeverity, Incident } from '../types';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getById(id!),
    enabled: !!id,
  });

  const { data: incidents = [], isLoading: incidentsLoading } = useQuery({
    queryKey: ['project-incidents', id],
    queryFn: () => incidentsApi.listForProject(id!),
    enabled: !!id,
  });

  if (projectLoading) {
    return (
      <div className="page-container">
        <div className="loading-container"><div className="loading-spinner" />Loading project...</div>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="page-container">
        <div className="error-container">
          <h3>Unable to load project</h3>
          <p>{projectError ? getErrorMessage(projectError) : 'Project not found'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/projects')}>Back to Projects</button>
        </div>
      </div>
    );
  }

  const activeIncidents = incidents.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.status));

  return (
    <div className="page-container">
      <div className="page-header page-header-actions">
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/projects')}>Projects</span>
            {' / '}
            <span style={{ fontFamily: 'var(--font-mono)' }}>{project.slug}</span>
          </div>
          <h1 className="page-title">{project.name}</h1>
          {project.description && <p className="page-subtitle">{project.description}</p>}
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Incident</button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Incidents</div>
          <div className="stat-value">{incidents.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active</div>
          <div className={`stat-value ${activeIncidents.length > 0 ? 'warning' : 'success'}`}>
            {activeIncidents.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Critical</div>
          <div className={`stat-value ${activeIncidents.filter((i) => i.severity === 'CRITICAL').length > 0 ? 'critical' : ''}`}>
            {activeIncidents.filter((i) => i.severity === 'CRITICAL').length}
          </div>
        </div>
      </div>

      {/* Incidents List */}
      <div className="card">
        <div className="card-header">
          <h2>Incidents</h2>
        </div>
        {incidentsLoading ? (
          <div className="loading-container"><div className="loading-spinner" />Loading incidents...</div>
        ) : incidents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No incidents yet</h3>
            <p>Create your first incident to start tracking issues.</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Incident</button>
          </div>
        ) : (
          <div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Title</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {incidents
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((incident) => {
                    const sev = SEVERITY_CONFIG[incident.severity];
                    const stat = STATUS_CONFIG[incident.status];
                    return (
                      <tr key={incident.id} onClick={() => navigate(`/incidents/${incident.id}`)}>
                        <td>
                          <span className={`badge badge-${incident.severity.toLowerCase()}`}>
                            {sev.icon} {sev.label}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500 }}>{incident.title}</td>
                        <td>
                          {incident.service ? (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {incident.service}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge badge-${incident.status.toLowerCase()}`}>{stat.label}</span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {timeAgo(incident.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateIncidentModal
          projectId={id!}
          onClose={() => setShowCreate(false)}
          onCreated={(incident) => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ['project-incidents', id] });
            navigate(`/incidents/${incident.id}`);
          }}
        />
      )}
    </div>
  );
}

function CreateIncidentModal({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string;
  onClose: () => void;
  onCreated: (incident: Incident) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [service, setService] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>('MEDIUM');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: CreateIncidentInput) => incidentsApi.create(projectId, data),
    onSuccess: (data) => onCreated(data),
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Report Incident</h2>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate({
              title,
              description: description || undefined,
              service: service || undefined,
              severity,
            });
          }}
        >
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label" htmlFor="inc-title">Title</label>
              <input
                id="inc-title"
                className="form-input"
                placeholder="e.g. Payment API returning 500 errors"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={3}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="inc-service">Service</label>
              <input
                id="inc-service"
                className="form-input"
                placeholder="e.g. payment-service"
                value={service}
                onChange={(e) => setService(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="inc-severity">Severity</label>
              <select
                id="inc-severity"
                className="form-select"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="inc-desc">Description</label>
              <textarea
                id="inc-desc"
                className="form-textarea"
                placeholder="Describe the incident..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
