import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { investigationsApi } from '../../services/api/investigationsApi';
import type { Incident } from '../../types';
import { timeAgo } from '../../utils';
import { InvestigationPipelineTracker } from './InvestigationPipelineTracker';
import { RootCausePanel } from './RootCausePanel';
import { HypothesisComparison } from './HypothesisComparison';
import { FindingsList } from './FindingsList';
import { EvidenceExplorer } from './EvidenceExplorer';
import { RecommendationPanel } from './RecommendationPanel';
import {
  Zap,
  Activity,
  Layers,
  FileText,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  AlertOctagon,
  Clock,
} from 'lucide-react';

interface Props {
  incident: Incident;
}

export const InvestigationControlRoom: React.FC<Props> = ({ incident }) => {
  const queryClient = useQueryClient();
  const [selectedInvId, setSelectedInvId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'hypotheses' | 'findings' | 'evidence' | 'recommendation' | 'runs'>('hypotheses');

  // Fetch list of investigations for this incident
  const { data: investigations = [] } = useQuery({
    queryKey: ['incident-investigations', incident.id],
    queryFn: () => investigationsApi.listForIncident(incident.id),
    refetchInterval: (query) => {
      const running = query.state.data?.some(
        (inv) => inv.status === 'RUNNING' || inv.status === 'PENDING',
      );
      return running ? 2000 : false;
    },
  });

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

  const evidenceList = activeInvestigation?.evidence || [];
  const hypothesesList = activeInvestigation?.hypotheses || [];
  const findingsList = activeInvestigation?.findings || [];
  const agentRuns = activeInvestigation?.agentRuns || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="badge badge-low">
            <CheckCircle2 size={12} />
            <span>Completed</span>
          </span>
        );
      case 'RUNNING':
        return (
          <span className="badge badge-investigating" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="radar-pulse-dot" style={{ width: 6, height: 6 }} />
            <span>Analyzing Telemetry...</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="badge badge-critical">
            <AlertOctagon size={12} />
            <span>Failed</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="badge badge-medium">
            <Clock size={12} />
            <span>Queued</span>
          </span>
        );
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="control-room-card">
      {/* Header */}
      <div className="control-room-header">
        <div className="control-room-title-area">
          <div className="control-room-title-row">
            <div className="radar-pulse-dot" />
            <span className="control-room-title">AI Investigation Control Room</span>
            {activeInvestigation && getStatusBadge(activeInvestigation.status)}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Autonomous evidence collection across logs, metrics, health, databases, deployments & configuration.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {investigations.length > 1 && (
            <select
              className="cmd-palette-input"
              style={{
                fontSize: '0.8rem',
                padding: '6px 10px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)',
              }}
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
          >
            {isRunning ? (
              <>
                <span className="radar-pulse-dot" style={{ width: 7, height: 7 }} />
                <span>Running Telemetry Agents...</span>
              </>
            ) : (
              <>
                <Zap size={14} />
                <span>{investigations.length > 0 ? 'Rerun Investigation' : 'Start AI Investigation'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Investigation Pipeline Tracker */}
      {activeInvestigation && (
        <InvestigationPipelineTracker status={activeInvestigation.status} />
      )}

      {/* Root Cause Panel */}
      {activeInvestigation?.rootCause && (
        <RootCausePanel
          rootCause={activeInvestigation.rootCause}
          confidence={activeInvestigation.confidence}
          confidenceFactors={activeInvestigation.confidenceFactors}
          summary={activeInvestigation.summary}
          supportingCount={evidenceList.length}
          contradictingCount={hypothesesList.filter((h) => h.status === 'REJECTED').length}
        />
      )}

      {/* Control Room Navigation Tabs */}
      <div className="inv-tabs-container" style={{ margin: 'var(--space-md) var(--space-lg) var(--space-lg) var(--space-lg)' }}>
        <div className="inv-tabs-header">
          <button
            className={`inv-tab-btn ${activeTab === 'hypotheses' ? 'active' : ''}`}
            onClick={() => setActiveTab('hypotheses')}
          >
            <Activity size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
            Hypotheses Comparison ({hypothesesList.length})
          </button>

          <button
            className={`inv-tab-btn ${activeTab === 'findings' ? 'active' : ''}`}
            onClick={() => setActiveTab('findings')}
          >
            <Layers size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
            Synthesized Findings ({findingsList.length})
          </button>

          <button
            className={`inv-tab-btn ${activeTab === 'evidence' ? 'active' : ''}`}
            onClick={() => setActiveTab('evidence')}
          >
            <FileText size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
            Evidence Explorer ({evidenceList.length})
          </button>

          <button
            className={`inv-tab-btn ${activeTab === 'recommendation' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommendation')}
          >
            <ShieldCheck size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
            Mitigation Recommendation
          </button>

          <button
            className={`inv-tab-btn ${activeTab === 'runs' ? 'active' : ''}`}
            onClick={() => setActiveTab('runs')}
          >
            <Cpu size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
            Agent Runs ({agentRuns.length})
          </button>
        </div>

        <div className="inv-tab-body">
          {activeTab === 'hypotheses' && (
            <HypothesisComparison hypotheses={hypothesesList} />
          )}

          {activeTab === 'findings' && (
            <FindingsList findings={findingsList} />
          )}

          {activeTab === 'evidence' && (
            <EvidenceExplorer evidence={evidenceList} />
          )}

          {activeTab === 'recommendation' && (
            <RecommendationPanel recommendation={activeInvestigation?.recommendation} />
          )}

          {activeTab === 'runs' && (
            <div>
              {agentRuns.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No agent execution records available.
                </div>
              ) : (
                <table className="inv-runs-table">
                  <thead>
                    <tr>
                      <th>Agent Role</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th>Execution Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentRuns.map((run) => (
                      <tr key={run.id}>
                        <td>
                          <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--brand-primary)' }}>
                            {run.agent}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${run.status === 'COMPLETED' ? 'badge-low' : 'badge-investigating'}`}>
                            {run.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {run.durationMs !== null ? `${run.durationMs}ms` : '—'}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {run.outputSummary || run.inputSummary || 'Processed'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
