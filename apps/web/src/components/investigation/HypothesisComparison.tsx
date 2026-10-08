import React, { useState } from 'react';
import type { InvestigationHypothesis } from '../../types/investigation';
import { HypothesisStatusBadge } from '../ui/Badge';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  hypotheses: InvestigationHypothesis[];
}

export const HypothesisComparison: React.FC<Props> = ({ hypotheses }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (hypotheses.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No hypotheses evaluated for this investigation run.
      </div>
    );
  }

  // Sort: supported first, then by confidence descending
  const sorted = [...hypotheses].sort((a, b) => {
    if (a.status === 'SUPPORTED' && b.status !== 'SUPPORTED') return -1;
    if (b.status === 'SUPPORTED' && a.status !== 'SUPPORTED') return 1;
    return b.confidence - a.confidence;
  });

  return (
    <div className="hypotheses-grid">
      {sorted.map((hyp) => {
        const percentage = Math.round(hyp.confidence * 100);
        const isSupported = hyp.status === 'SUPPORTED';
        const isExpanded = expandedId === hyp.id;

        return (
          <div
            key={hyp.id}
            className={`hypothesis-item ${isSupported ? 'supported' : 'rejected'}`}
          >
            <div
              className="hypothesis-row"
              style={{ cursor: 'pointer' }}
              onClick={() => setExpandedId(isExpanded ? null : hyp.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 240 }}>
                {isExpanded ? <ChevronDown size={15} color="var(--text-muted)" /> : <ChevronRight size={15} color="var(--text-muted)" />}
                <span className="hypothesis-desc">{hyp.description}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Horizontal Confidence Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 140 }}>
                  <div className="confidence-bar-bg" style={{ width: 80, height: 6 }}>
                    <div
                      className="confidence-bar-fill"
                      style={{
                        width: `${percentage}%`,
                        background: isSupported ? 'var(--success)' : 'var(--text-muted)',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {percentage}%
                  </span>
                </div>

                <HypothesisStatusBadge status={hyp.status} />
              </div>
            </div>

            {/* Expandable Reasoning Drawer */}
            {isExpanded && (
              <div
                style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '0.82rem',
                  lineHeight: 1.55,
                }}
              >
                <div style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {hyp.reasoning}
                </div>

                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} color="var(--success)" />
                    <span>{hyp.supportingEvidenceIds?.length || 0} supporting evidence items</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <XCircle size={12} color="var(--text-muted)" />
                    <span>{hyp.contradictingEvidenceIds?.length || 0} contradicting / alternative factors</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
