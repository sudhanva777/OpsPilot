import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { incidentsApi } from '../services/api/incidentsApi';
import { InvestigationControlRoom } from '../components/investigation/InvestigationControlRoom';
import { IncidentImpactBanner } from '../components/incident/IncidentImpactBanner';
import { ServiceTopologyView } from '../components/incident/ServiceTopologyView';
import { IncidentTimeline } from '../components/incident/IncidentTimeline';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import {
  STATUS_CONFIG,
  timeAgo,
  formatDate,
  getErrorMessage,
} from '../utils';
import { VALID_STATUS_TRANSITIONS } from '../types';
import type { IncidentStatus } from '../types';
import {
  Activity,
  Layers,
  Clock,
  ArrowLeft,
  Copy,
  Check,
  Server,
} from 'lucide-react';

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'investigation' | 'topology' | 'timeline'>('investigation');
  const [copied, setCopied] = useState(false);

  const {
    data: incident,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['incident', id],
    queryFn: () => incidentsApi.getById(id!),
    enabled: !!id,
    refetchInterval: 10_000,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['incident-events', id],
    queryFn: () => incidentsApi.getEvents(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="page-container">
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
          Loading incident operations telemetry...
        </div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="page-container">
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Unable to load incident</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
            {error ? getErrorMessage(error) : 'Incident record not found'}
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/incidents')}>
            Return to Incidents
          </button>
        </div>
      </div>
    );
  }

  const validTransitions = VALID_STATUS_TRANSITIONS[incident.status] || [];

  const handleCopyId = () => {
    navigator.clipboard.writeText(incident.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-container">
      {/* Breadcrumb Navigation */}
      <div className="breadcrumb-bar">
        <span className="breadcrumb-item" onClick={() => navigate('/dashboard')}>
          Operations
        </span>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-item" onClick={() => navigate('/incidents')}>
          Incidents
        </span>
        <span className="breadcrumb-sep">/</span>
        <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
          {incident.service || 'INCIDENT'}
        </span>
      </div>

      {/* Incident Hero Header */}
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
            {incident.service && (
              <span className="badge-telemetry badge-telemetry-log">
                <Server size={11} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
                {incident.service}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleCopyId}
              title="Copy Incident ID"
            >
              {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy ID'}</span>
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/incidents')}
            >
              <ArrowLeft size={12} />
              <span>All Incidents</span>
            </button>
          </div>
        </div>

        <h1 className="page-title" style={{ fontSize: '1.75rem', lineHeight: 1.25 }}>
          {incident.title}
        </h1>
        {incident.description && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '6px', maxWidth: 840, lineHeight: 1.55 }}>
            {incident.description}
          </p>
        )}
      </div>

      {/* Hero Impact Metrics Banner */}
      <IncidentImpactBanner incident={incident} />

      {/* Main Grid: Control Room Content + Side Details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 300px',
          gap: 'var(--space-xl)',
          alignItems: 'start',
        }}
      >
        {/* Left Column: AI Control Room, Topology & Timeline */}
        <div>
          {/* Subsystem Navigation Tabs */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: 'var(--space-md)', borderBottom: '1px solid var(--border-primary)', paddingBottom: '6px' }}>
            <button
              className={`inv-tab-btn ${activeTab === 'investigation' ? 'active' : ''}`}
              onClick={() => setActiveTab('investigation')}
            >
              <Activity size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
              AI Investigation Control Room
            </button>
            <button
              className={`inv-tab-btn ${activeTab === 'topology' ? 'active' : ''}`}
              onClick={() => setActiveTab('topology')}
            >
              <Layers size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
              Service Dependency Topology
            </button>
            <button
              className={`inv-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              <Clock size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
              Incident Audit Timeline ({events.length})
            </button>
          </div>

          {activeTab === 'investigation' && (
            <InvestigationControlRoom incident={incident} />
          )}

          {activeTab === 'topology' && (
            <ServiceTopologyView incident={incident} />
          )}

          {activeTab === 'timeline' && (
            <div className="card" style={{ padding: 'var(--space-lg)' }}>
              <IncidentTimeline events={events} />
            </div>
          )}
        </div>

        {/* Right Column: Incident Management Sidebar */}
        <div>
          {/* Status Lifecycle Actions */}
          <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
            <div className="card-header">
              <h3>Lifecycle Management</h3>
            </div>
            <div className="card-body">
              {validTransitions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {validTransitions.map((targetStatus) => {
                    const cfg = STATUS_CONFIG[targetStatus];
                    return (
                      <StatusTransitionButton
                        key={targetStatus}
                        incidentId={incident.id}
                        targetStatus={targetStatus}
                        label={`Transition to ${cfg.label}`}
                        onSuccess={() => {
                          queryClient.invalidateQueries({ queryKey: ['incident', id] });
                          queryClient.invalidateQueries({ queryKey: ['incident-events', id] });
                          queryClient.invalidateQueries({ queryKey: ['dashboard-incidents'] });
                        }}
                      />
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  No further status transitions available for closed incidents.
                </p>
              )}
            </div>
          </div>

          {/* Incident Metadata Details */}
          <div className="card">
            <div className="card-header">
              <h3>Incident Parameters</h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Incident UUID
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '2px', wordBreak: 'break-all' }}>
                  {incident.id}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Reported Timeline
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {timeAgo(incident.createdAt)}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {formatDate(incident.createdAt)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Assigned Operator
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {incident.assignedTo?.name || 'Unassigned (SRE On-Call Pool)'}
                </div>
              </div>

              {incident.resolvedAt && (
                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Resolved Timestamp
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--success)', marginTop: '2px' }}>
                    {formatDate(incident.resolvedAt)}
                  </div>
                </div>
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

  return (
    <button
      className="btn btn-secondary btn-sm"
      style={{
        width: '100%',
        justifyContent: 'center',
        fontWeight: 600,
      }}
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? 'Transitioning...' : label}
    </button>
  );
}
