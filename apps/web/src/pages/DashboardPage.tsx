import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../services/api/projectsApi';
import { incidentsApi } from '../services/api/incidentsApi';
import { SEVERITY_CONFIG, STATUS_CONFIG, timeAgo } from '../utils';
import type { Incident, IncidentSeverity, IncidentStatus } from '../types';

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  // Fetch incidents for all projects
  const { data: allIncidents = [], isLoading } = useQuery({
    queryKey: ['dashboard-incidents', projects.map((p) => p.id)],
    queryFn: async () => {
      if (projects.length === 0) return [];
      const results = await Promise.all(
        projects.map((p) => incidentsApi.listForProject(p.id)),
      );
      return results.flat();
    },
    enabled: projects.length > 0,
  });

  const activeIncidents = allIncidents.filter(
    (i) => !['RESOLVED', 'CLOSED'].includes(i.status),
  );
  const criticalCount = activeIncidents.filter((i) => i.severity === 'CRITICAL').length;
  const highCount = activeIncidents.filter((i) => i.severity === 'HIGH').length;
  const resolvedToday = allIncidents.filter((i) => {
    if (!i.resolvedAt) return false;
    const resolved = new Date(i.resolvedAt);
    const today = new Date();
    return resolved.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Operations Dashboard</h1>
        <p className="page-subtitle">Real-time operational overview across all projects</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Active Incidents</div>
          <div className={`stat-value ${activeIncidents.length > 0 ? 'warning' : 'success'}`}>
            {activeIncidents.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Critical</div>
          <div className={`stat-value ${criticalCount > 0 ? 'critical' : ''}`}>
            {criticalCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">High</div>
          <div className={`stat-value ${highCount > 0 ? 'high' : ''}`}>
            {highCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Resolved Today</div>
          <div className="stat-value success">{resolvedToday}</div>
        </div>
      </div>

      {/* Active Incidents */}
      <div className="card">
        <div className="card-header">
          <h2>Active Incidents</h2>
        </div>
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            Loading incidents...
          </div>
        ) : activeIncidents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <h3>All Clear</h3>
            <p>No active incidents across your projects.</p>
          </div>
        ) : (
          <div>
            {activeIncidents
              .sort((a, b) => {
                const order: IncidentSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
                return order.indexOf(a.severity) - order.indexOf(b.severity);
              })
              .map((incident) => (
                <IncidentRow
                  key={incident.id}
                  incident={incident}
                  onClick={() => navigate(`/incidents/${incident.id}`)}
                />
              ))}
          </div>
        )}
      </div>

      {/* Projects Overview */}
      {projects.length > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <h2>Projects</h2>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/projects')}>
              View All
            </button>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
              {projects.slice(0, 6).map((project) => (
                <div
                  key={project.id}
                  className="stat-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{project.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {project.slug}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IncidentRow({ incident, onClick }: { incident: Incident; onClick: () => void }) {
  const sevConfig = SEVERITY_CONFIG[incident.severity];
  const statusConfig = STATUS_CONFIG[incident.status];

  return (
    <div className="incident-row" onClick={onClick}>
      <span style={{ fontSize: '1.2rem' }}>{sevConfig.icon}</span>
      <div>
        <div className="incident-row-title">{incident.title}</div>
        {incident.service && (
          <div className="incident-row-service">{incident.service}</div>
        )}
      </div>
      <span className={`badge badge-${incident.severity.toLowerCase()}`}>
        {sevConfig.label}
      </span>
      <span className={`badge badge-${incident.status.toLowerCase()}`}>
        {statusConfig.label}
      </span>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
        {timeAgo(incident.createdAt)}
      </span>
    </div>
  );
}
