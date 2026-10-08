import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../services/api/projectsApi';
import { incidentsApi } from '../services/api/incidentsApi';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { timeAgo, getErrorMessage } from '../utils';
import type { CreateIncidentInput, IncidentSeverity, Incident } from '../types';
import { Plus, AlertTriangle, X } from 'lucide-react';

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
    refetchInterval: 10_000,
  });

  if (projectLoading) {
    return (
      <div className="page-container">
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
          Loading project operations...
        </div>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="page-container">
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Unable to load project</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>{projectError ? getErrorMessage(projectError) : 'Project not found'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/projects')}>Back to Projects</button>
        </div>
      </div>
    );
  }

  const activeIncidents = incidents.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.status));
  const criticalCount = activeIncidents.filter((i) => i.severity === 'CRITICAL').length;

  return (
    <div className="page-container">
      {/* Breadcrumb Navigation */}
      <div className="breadcrumb-bar">
        <span className="breadcrumb-item" onClick={() => navigate('/projects')}>
          Projects
        </span>
        <span className="breadcrumb-sep">/</span>
        <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
          {project.slug}
        </span>
      </div>

      <div className="page-header page-header-actions">
        <div>
          <h1 className="page-title">{project.name}</h1>
          {project.description && <p className="page-subtitle">{project.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={15} />
            <span>Report Incident</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Incidents Tracked</div>
          <div className="stat-value">{incidents.length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Active Degradations</div>
          <div className={`stat-value ${activeIncidents.length > 0 ? 'warning' : 'success'}`}>
            {activeIncidents.length}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Critical Priority (P0)</div>
          <div className={`stat-value ${criticalCount > 0 ? 'critical' : ''}`}>
            {criticalCount}
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="card">
        <div className="card-header">
          <h2>Project Incidents ({incidents.length})</h2>
        </div>

        {incidentsLoading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading incidents...
          </div>
        ) : incidents.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle size={24} color="#10b981" />}
            title="Zero Incidents Reported"
            description="This project currently has a clean operational record. When alerts occur, report or dispatch them here."
            action={{
              label: 'Report First Incident',
              onClick: () => setShowCreate(true),
            }}
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Severity</th>
                <th>Incident</th>
                <th>Service</th>
                <th>Status</th>
                <th>Reported</th>
              </tr>
            </thead>
            <tbody>
              {incidents
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((incident) => (
                  <tr key={incident.id} onClick={() => navigate(`/incidents/${incident.id}`)}>
                    <td>
                      <SeverityBadge severity={incident.severity} />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {incident.title}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--brand-primary)' }}>
                        {incident.service || '—'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={incident.status} />
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {timeAgo(incident.createdAt)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
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
  const [severity, setSeverity] = useState<IncidentSeverity>('HIGH');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: CreateIncidentInput) => incidentsApi.create(projectId, data),
    onSuccess: (data) => onCreated(data),
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <div className="cmd-palette-backdrop" onClick={onClose}>
      <div className="cmd-palette-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-primary)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Report Production Incident</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            mutation.mutate({
              title: title.trim(),
              description: description.trim() || undefined,
              service: service.trim() || undefined,
              severity,
            });
          }}
          style={{ padding: '20px' }}
        >
          {error && <div className="alert alert-error" style={{ marginBottom: '14px' }}>{error}</div>}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Incident Title *
            </label>
            <input
              className="cmd-palette-input"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-primary)',
              }}
              placeholder="e.g. Ingress API returning 504 Gateway Timeout"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Impacted Service Name
            </label>
            <input
              className="cmd-palette-input"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-primary)',
              }}
              placeholder="e.g. order-api, payment-service, redis"
              value={service}
              onChange={(e) => setService(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Priority / Severity
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as IncidentSeverity[]).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  className={`filter-chip ${severity === sev ? 'active' : ''}`}
                  onClick={() => setSeverity(sev)}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Symptoms / Description
            </label>
            <textarea
              className="cmd-palette-input"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-primary)',
                minHeight: 80,
                resize: 'vertical',
              }}
              placeholder="Observed symptoms, error rates, customer impact, or related alerts"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending || !title.trim()}>
              {mutation.isPending ? 'Reporting...' : 'Report Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
