import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../services/api/projectsApi';
import { incidentsApi } from '../services/api/incidentsApi';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { timeAgo } from '../utils';
import type { IncidentSeverity } from '../types';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Server,
  Database,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  // Fetch incidents for all projects
  const { data: allIncidents = [], isLoading: incidentsLoading } = useQuery({
    queryKey: ['dashboard-incidents', projects.map((p) => p.id)],
    queryFn: async () => {
      if (projects.length === 0) return [];
      const results = await Promise.all(
        projects.map((p) => incidentsApi.listForProject(p.id)),
      );
      return results.flat();
    },
    enabled: projects.length > 0,
    refetchInterval: 10_000,
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

  const filteredIncidents =
    severityFilter === 'ALL'
      ? activeIncidents
      : activeIncidents.filter((i) => i.severity === severityFilter);

  const isSystemDegraded = criticalCount > 0 || highCount > 0;

  return (
    <div className="page-container">
      {/* Hero Operational Banner */}
      <div
        style={{
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: isSystemDegraded
            ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(13, 18, 28, 0.9) 100%)'
            : 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(13, 18, 28, 0.9) 100%)',
          border: `1px solid ${
            isSystemDegraded ? 'rgba(244, 63, 94, 0.35)' : 'rgba(16, 185, 129, 0.25)'
          }`,
          boxShadow: isSystemDegraded
            ? '0 0 24px rgba(244, 63, 94, 0.12)'
            : '0 0 24px rgba(16, 185, 129, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              background: isSystemDegraded ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSystemDegraded ? (
              <AlertTriangle size={20} color="var(--severity-critical)" />
            ) : (
              <CheckCircle2 size={20} color="var(--success)" />
            )}
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
              {isSystemDegraded
                ? `Production Degradation Alert — ${activeIncidents.length} Active Incident${
                    activeIncidents.length > 1 ? 's' : ''
                  }`
                : 'All Production Systems Operational'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {isSystemDegraded
                ? `${criticalCount} critical, ${highCount} high severity failure modes requiring SRE investigation.`
                : 'Zero active incident blockers detected. Autonomous telemetry collectors active.'}
            </div>
          </div>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate('/incidents')}
        >
          <span>View Incidents Catalog</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label-row">
            <span className="stat-label">Active Incidents</span>
            <Activity size={16} color="var(--text-muted)" />
          </div>
          <div className={`stat-value ${activeIncidents.length > 0 ? 'warning' : 'success'}`}>
            {activeIncidents.length}
          </div>
          <div className="stat-subtext">
            <span>{criticalCount > 0 ? `${criticalCount} require immediate triage` : 'Normal threshold'}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label-row">
            <span className="stat-label">Critical Priority</span>
            <span className="badge badge-critical" style={{ fontSize: '0.62rem' }}>P0 / P1</span>
          </div>
          <div className={`stat-value ${criticalCount > 0 ? 'critical' : ''}`}>
            {criticalCount}
          </div>
          <div className="stat-subtext">
            <span>{criticalCount === 0 ? 'Zero critical incidents' : 'Blocking production traffic'}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label-row">
            <span className="stat-label">High Severity</span>
            <span className="badge badge-high" style={{ fontSize: '0.62rem' }}>P2</span>
          </div>
          <div className={`stat-value ${highCount > 0 ? 'high' : ''}`}>
            {highCount}
          </div>
          <div className="stat-subtext">
            <span>Degraded subsystem performance</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label-row">
            <span className="stat-label">Resolved Today</span>
            <TrendingUp size={16} color="var(--success)" />
          </div>
          <div className="stat-value success">{resolvedToday}</div>
          <div className="stat-subtext">
            <span>Closed during current operational cycle</span>
          </div>
        </div>
      </div>

      {/* Operational Telemetry Subsystems Overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px',
          marginBottom: 'var(--space-xl)',
        }}
      >
        <div className="card" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Server size={18} color="#60a5fa" />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>API Gateway & Ingress</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Status: 99.92% Availability</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={18} color="#fbbf24" />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Database Infrastructure</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Connections: Monitored via Agents</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={18} color="#c084fc" />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Async Workers & Queues</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Consumer Telemetry Active</div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Incidents Queue */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2>Active Incidents Queue</h2>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
                <button
                  key={sev}
                  className={`filter-chip ${severityFilter === sev ? 'active' : ''}`}
                  onClick={() => setSeverityFilter(sev)}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/incidents')}
          >
            All Incidents
          </button>
        </div>

        {incidentsLoading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading operational telemetry...
          </div>
        ) : filteredIncidents.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={24} color="#10b981" />}
            title="All Clear in this Priority Tier"
            description="No active incidents match the selected severity filter."
          />
        ) : (
          <div>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Severity</th>
                  <th>Incident Details</th>
                  <th>Affected Service</th>
                  <th>Status</th>
                  <th>Age</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents
                  .sort((a, b) => {
                    const order: IncidentSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
                    return order.indexOf(a.severity) - order.indexOf(b.severity);
                  })
                  .map((incident) => (
                    <tr
                      key={incident.id}
                      onClick={() => navigate(`/incidents/${incident.id}`)}
                    >
                      <td>
                        <SeverityBadge severity={incident.severity} />
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {incident.title}
                        </div>
                        {incident.description && (
                          <div
                            style={{
                              fontSize: '0.78rem',
                              color: 'var(--text-muted)',
                              marginTop: '2px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 500,
                            }}
                          >
                            {incident.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--brand-primary)' }}>
                          {incident.service || 'system'}
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
          </div>
        )}
      </div>

      {/* Projects Catalog Overview */}
      {projects.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Managed Projects Catalog</h2>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/projects')}>
              View All ({projects.length})
            </button>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
              {projects.slice(0, 6).map((project) => (
                <div
                  key={project.id}
                  className="stat-card"
                  style={{ cursor: 'pointer', padding: '14px 18px' }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {project.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
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
