import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../services/api/projectsApi';
import { incidentsApi } from '../services/api/incidentsApi';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { timeAgo } from '../utils';
import type { IncidentSeverity } from '../types';
import { Search, AlertTriangle } from 'lucide-react';

export default function IncidentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

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

  const filtered = allIncidents.filter((inc) => {
    if (severityFilter !== 'ALL' && inc.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'ACTIVE' && ['RESOLVED', 'CLOSED'].includes(inc.status)) return false;
      if (statusFilter !== 'ACTIVE' && inc.status !== statusFilter) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = inc.title.toLowerCase().includes(q);
      const matchDesc = inc.description?.toLowerCase().includes(q) || false;
      const matchService = inc.service?.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchDesc && !matchService) return false;
    }
    return true;
  });

  return (
    <div className="page-container">
      <div className="page-header page-header-actions">
        <div>
          <h1 className="page-title">Incidents Catalog</h1>
          <p className="page-subtitle">Production degradation, telemetry anomalies, and active investigations</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          marginBottom: 'var(--space-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 260 }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            className="cmd-palette-input"
            placeholder="Search by title, service, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: '0.88rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Status filters */}
          <div style={{ display: 'flex', gap: '5px' }}>
            {['ALL', 'ACTIVE', 'OPEN', 'INVESTIGATING', 'RESOLVED'].map((st) => (
              <button
                key={st}
                className={`filter-chip ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Severity filters */}
          <div style={{ display: 'flex', gap: '5px', borderLeft: '1px solid var(--border-primary)', paddingLeft: '12px' }}>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
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
      </div>

      {/* Incidents Table */}
      <div className="card">
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading incidents catalog...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle size={24} color="var(--text-muted)" />}
            title="No Incidents Found"
            description="No incidents match your current search query or active filter criteria."
            action={{
              label: 'Reset Filters',
              onClick: () => {
                setSearch('');
                setSeverityFilter('ALL');
                setStatusFilter('ALL');
              },
            }}
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Severity</th>
                <th>Incident</th>
                <th>Affected Service</th>
                <th>Status</th>
                <th>Reported</th>
              </tr>
            </thead>
            <tbody>
              {filtered
                .sort((a, b) => {
                  const order: IncidentSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
                  return order.indexOf(a.severity) - order.indexOf(b.severity);
                })
                .map((inc) => (
                  <tr key={inc.id} onClick={() => navigate(`/incidents/${inc.id}`)}>
                    <td>
                      <SeverityBadge severity={inc.severity} />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {inc.title}
                      </div>
                      {inc.description && (
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                            marginTop: '2px',
                            maxWidth: 550,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {inc.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.8rem',
                          color: 'var(--brand-primary)',
                        }}
                      >
                        {inc.service || 'system'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={inc.status} />
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {timeAgo(inc.createdAt)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
