import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { investigationsApi } from '../../services/api/investigationsApi';
import type { Incident } from '../../types';
import { formatDate, timeAgo } from '../../utils';

interface Props {
  incident: Incident;
}

export const InvestigationControlRoom: React.FC<Props> = ({ incident }) => {
  const queryClient = useQueryClient();
  const [selectedInvId, setSelectedInvId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'evidence' | 'hypotheses' | 'runs'>('evidence');
  const [evidenceFilter, setEvidenceFilter] = useState<string>('ALL');

  // Fetch list of investigations for this incident
  const { data: investigations = [] } = useQuery({
    queryKey: ['incident-investigations', incident.id],
    queryFn: () => investigationsApi.listForIncident(incident.id),
    refetchInterval: (query) => {
      // Poll every 2 seconds if any investigation is running
      const running = query.state.data?.some(
        (inv) => inv.status === 'RUNNING' || inv.status === 'PENDING',
      );
      return running ? 2000 : false;
    },
  });

  // Current active investigation (selected or latest)
  const currentInvestigationId =
    selectedInvId || (investigations.length > 0 ? investigations[0].id : null);

  // Fetch full details of the active investigation
  const { data: activeInvestigation } = useQuery({
    queryKey: ['investigation-detail', currentInvestigationId],
    queryFn: () => investigationsApi.getById(currentInvestigationId!),
    enabled: !!currentInvestigationId,

    refetchInterval: (query) => {
      return query.state.data?.status === 'RUNNING' ? 2000 : false;
    },
  });

  // Mutation to start investigation
  const startMutation = useMutation({
    mutationFn: () => investigationsApi.start(incident.id),
    onSuccess: (newInv) => {
      setSelectedInvId(newInv.id);
      queryClient.invalidateQueries({
        queryKey: ['incident-investigations', incident.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['investigation-detail', newInv.id],
      });
    },
  });

  const isRunning =
    startMutation.isPending ||
    activeInvestigation?.status === 'RUNNING' ||
    activeInvestigation?.status === 'PENDING';

  // Evidence filtering
  const evidenceList = activeInvestigation?.evidence || [];
  const filteredEvidence =
    evidenceFilter === 'ALL'
      ? evidenceList
      : evidenceList.filter((e) => e.type === evidenceFilter);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="inv-badge inv-badge-success">✓ Completed</span>;
      case 'RUNNING':
        return <span className="inv-badge inv-badge-running">⚡ Running Agents</span>;
      case 'FAILED':
        return <span className="inv-badge inv-badge-failed">✗ Failed</span>;
      case 'PENDING':
        return <span className="inv-badge inv-badge-pending">⏳ Pending</span>;
      default:
        return <span className="inv-badge">{status}</span>;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return <span className="badge badge-critical">CRITICAL RISK</span>;
      case 'HIGH':
        return <span className="badge badge-high">HIGH RISK</span>;
      case 'MEDIUM':
        return <span className="badge badge-medium">MEDIUM RISK</span>;
      default:
        return <span className="badge badge-low">LOW RISK</span>;
    }
  };

  return (
    <div className="control-room-card">
      {/* Control Room Header */}
      <div className="control-room-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>🤖</span>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
              AI Investigation Control Room
            </h2>
            {activeInvestigation && getStatusBadge(activeInvestigation.status)}
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Autonomous evidence collection across logs, metrics, health, databases, deployments & configuration.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {investigations.length > 1 && (
            <select
              className="inv-history-select"
              value={currentInvestigationId || ''}
              onChange={(e) => setSelectedInvId(e.target.value)}
            >
              {investigations.map((inv, idx) => (
                <option key={inv.id} value={inv.id}>
                  Run #{investigations.length - idx} ({inv.status}) - {timeAgo(inv.startedAt)}
                </option>
              ))}
            </select>
          )}

          <button
            className="btn btn-primary"
            disabled={isRunning}
            onClick={() => startMutation.mutate()}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {isRunning ? (
              <>
                <div className="spinner-sm" />
                <span>Investigating Telemetry...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>{investigations.length > 0 ? 'Rerun Investigation' : 'Start AI Investigation'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {startMutation.isError && (
        <div className="inv-alert inv-alert-danger" style={{ marginTop: '16px' }}>
          <strong>Investigation Dispatch Failed:</strong>{' '}
          {(startMutation.error as any)?.response?.data?.message ||
            (startMutation.error as any)?.message ||
            'Unable to communicate with AI investigation service.'}
        </div>
      )}

      {/* When no investigation has been run yet */}
      {investigations.length === 0 && !isRunning && (
        <div className="inv-empty-state">
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔍</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>No AI Investigation Executed Yet</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', maxWidth: '480px', fontSize: '0.9rem' }}>
            OpsPilot can autonomously collect multi-domain telemetry, generate competing hypotheses,
            and formulate evidence-backed root cause analysis for this incident.
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '16px' }}
            onClick={() => startMutation.mutate()}
          >
            ⚡ Launch Investigation
          </button>
        </div>
      )}

      {/* Active Running State */}
      {isRunning && (
        <div className="inv-running-banner">
          <div className="radar-pulse-ring" />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
              LangGraph Orchestration in Progress
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Executing 6 parallel evidence agents: LogAgent, HealthAgent, DatabaseAgent, MetricsAgent, DeploymentAgent, ConfigurationAgent...
            </div>
          </div>
        </div>
      )}

      {/* Investigation Results Display */}
      {activeInvestigation && activeInvestigation.status !== 'RUNNING' && (
        <div style={{ marginTop: '20px' }}>
          {/* Top Hero Grid: RCA + Recommendation */}
          <div className="inv-hero-grid">
            {/* Root Cause Card */}
            <div className="inv-rca-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="inv-card-kicker">ROOT CAUSE ANALYSIS</span>
                {activeInvestigation.confidence !== null && (
                  <div className="confidence-pill">
                    <span className="confidence-value">
                      {Math.round(activeInvestigation.confidence * 100)}%
                    </span>
                    <span className="confidence-label">Confidence</span>
                  </div>
                )}
              </div>

              <h3 className="inv-rca-title">
                {activeInvestigation.rootCause || 'Root cause under investigation'}
              </h3>

              {activeInvestigation.summary && (
                <p className="inv-rca-summary">{activeInvestigation.summary}</p>
              )}

              {/* Confidence Factors / Why Breakdown */}
              {activeInvestigation.confidenceFactors?.length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Telemetry Correlation Factors:
                  </div>
                  <ul className="confidence-factors-list">
                    {activeInvestigation.confidenceFactors.map((factor, idx) => (
                      <li key={idx}>
                        <span style={{ color: '#10b981', marginRight: '6px' }}>✓</span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Recommendation Card */}
            {activeInvestigation.recommendation && (
              <div className="inv-rec-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="inv-card-kicker">RECOMMENDED REMEDIATION</span>
                  {getRiskBadge(activeInvestigation.recommendation.riskLevel)}
                </div>

                <h4 className="inv-rec-action">
                  {activeInvestigation.recommendation.action}
                </h4>

                <p className="inv-rec-reason">
                  {activeInvestigation.recommendation.reason}
                </p>

                {activeInvestigation.recommendation.mitigationSteps?.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Recommended Steps:
                    </div>
                    <ol className="rec-steps-list">
                      {activeInvestigation.recommendation.mitigationSteps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Remediation Safety Guardrail Indicator */}
                <div className="safeguard-banner">
                  <span style={{ fontSize: '1.1rem' }}>🛡️</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#f59e0b' }}>
                      Production Safeguard Active
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      No automated remediation was executed. Human authorization required before applying changes.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Telemetry Tabs: Evidence / Hypotheses / Agent Runs */}
          <div className="inv-tabs-container">
            <div className="inv-tabs-header">
              <button
                className={`inv-tab-btn ${activeTab === 'evidence' ? 'active' : ''}`}
                onClick={() => setActiveTab('evidence')}
              >
                📊 Collected Evidence ({activeInvestigation.evidence?.length || 0})
              </button>
              <button
                className={`inv-tab-btn ${activeTab === 'hypotheses' ? 'active' : ''}`}
                onClick={() => setActiveTab('hypotheses')}
              >
                🔬 Evaluated Hypotheses ({activeInvestigation.hypotheses?.length || 0})
              </button>
              <button
                className={`inv-tab-btn ${activeTab === 'runs' ? 'active' : ''}`}
                onClick={() => setActiveTab('runs')}
              >
                ⚙️ Agent Execution Log ({activeInvestigation.agentRuns?.length || 0})
              </button>
            </div>

            {/* TAB 1: Evidence Explorer */}
            {activeTab === 'evidence' && (
              <div className="inv-tab-body">
                {/* Filter tags */}
                <div className="evidence-filter-bar">
                  {['ALL', 'LOG', 'HEALTH', 'DATABASE', 'METRIC', 'DEPLOYMENT', 'CONFIGURATION'].map(
                    (filter) => (
                      <button
                        key={filter}
                        className={`filter-chip ${evidenceFilter === filter ? 'active' : ''}`}
                        onClick={() => setEvidenceFilter(filter)}
                      >
                        {filter}
                      </button>
                    ),
                  )}
                </div>

                {filteredEvidence.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', padding: '16px', textAlign: 'center' }}>
                    No evidence records matching filter "{evidenceFilter}".
                  </p>
                ) : (
                  <div className="evidence-grid">
                    {filteredEvidence.map((ev) => (
                      <div key={ev.id} className="evidence-item-card">
                        <div className="evidence-item-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={`evidence-type-badge type-${ev.type.toLowerCase()}`}>
                              {ev.type}
                            </span>
                            <span className="evidence-title">{ev.title}</span>
                          </div>
                          <span className="evidence-timestamp">
                            {formatDate(ev.collectedAt)}
                          </span>
                        </div>

                        <div className="evidence-source">
                          Source: <code>{ev.source}</code>
                        </div>

                        <pre className="evidence-content-pre">
                          {ev.content}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Hypotheses Engine */}
            {activeTab === 'hypotheses' && (
              <div className="inv-tab-body">
                <div className="hypotheses-list">
                  {activeInvestigation.hypotheses?.map((h) => {
                    const isSupported = h.status === 'SUPPORTED';
                    return (
                      <div
                        key={h.id}
                        className={`hypothesis-card ${isSupported ? 'hypothesis-supported' : 'hypothesis-rejected'}`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              className={`hyp-status-badge ${isSupported ? 'badge-supported' : 'badge-rejected'}`}
                            >
                              {isSupported ? '✓ SUPPORTED' : '✗ REJECTED'}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                              {h.description}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            {Math.round(h.confidence * 100)}% Match
                          </span>
                        </div>

                        <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {h.reasoning}
                        </p>

                        {h.supportingEvidenceIds?.length > 0 && (
                          <div style={{ marginTop: '8px', fontSize: '0.75rem' }}>
                            <span style={{ color: '#10b981', fontWeight: 600 }}>Supporting Evidence: </span>
                            {h.supportingEvidenceIds.join(', ')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: Agent Execution Runs */}
            {activeTab === 'runs' && (
              <div className="inv-tab-body">
                <table className="inv-runs-table">
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th>Execution Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeInvestigation.agentRuns?.map((run, idx) => (
                      <tr key={run.id || idx}>
                        <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{run.agent}</td>
                        <td>
                          <span
                            className={`inv-badge ${run.status === 'COMPLETED' ? 'inv-badge-success' : 'inv-badge-failed'}`}
                          >
                            {run.status}
                          </span>
                        </td>
                        <td>{run.durationMs !== null ? `${run.durationMs}ms` : '—'}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {run.outputSummary || run.inputSummary || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
