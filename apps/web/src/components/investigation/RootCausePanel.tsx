import React from 'react';
import { ConfidenceMeter } from '../ui/ConfidenceMeter';
import { Target, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  rootCause: string | null;
  confidence: number | null;
  confidenceFactors?: string[];
  summary?: string | null;
  supportingCount?: number;
  contradictingCount?: number;
}

export const RootCausePanel: React.FC<Props> = ({
  rootCause,
  confidence,
  confidenceFactors = [],
  summary,
  supportingCount = 0,
  contradictingCount = 0,
}) => {
  if (!rootCause) return null;

  const isInconclusive = rootCause.toLowerCase().includes('inconclusive');

  return (
    <div className="rca-hero-panel">
      <div className="rca-hero-header">
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="rca-title-label">
            <Target size={14} />
            <span>{isInconclusive ? 'Investigation Outcome' : 'Identified Root Cause (RCA)'}</span>
          </div>
          <div className="rca-root-cause-text">
            {rootCause}
          </div>

          {summary && (
            <p style={{ marginTop: '10px', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              {summary}
            </p>
          )}

          {/* Supporting & Contradicting Counters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px', flexWrap: 'wrap' }}>
            {supportingCount > 0 && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: 'var(--success)',
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <CheckCircle2 size={12} />
                <span>{supportingCount} Supporting Telemetry Signals</span>
              </span>
            )}

            {contradictingCount > 0 && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  background: 'var(--bg-canvas)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <XCircle size={12} />
                <span>{contradictingCount} Contradicted Alternatives</span>
              </span>
            )}
          </div>
        </div>

        {/* Confidence Gauge */}
        {confidence !== null && (
          <div style={{ alignSelf: 'flex-start' }}>
            <ConfidenceMeter
              confidence={confidence}
              factors={confidenceFactors}
            />
          </div>
        )}
      </div>
    </div>
  );
};
