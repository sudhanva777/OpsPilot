import React from 'react';
import type { InvestigationFinding } from '../../types/investigation';
import { DomainBadge } from '../ui/Badge';
import { Eye } from 'lucide-react';

interface Props {
  findings?: InvestigationFinding[];
}

export const FindingsList: React.FC<Props> = ({ findings = [] }) => {
  if (findings.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No synthesized findings available.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Eye size={15} color="var(--brand-primary)" />
        <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Synthesized Operational Findings ({findings.length})
        </span>
        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
          (Normalized interpretations extracted from raw telemetry)
        </span>
      </div>

      <div className="findings-grid">
        {findings.map((f, idx) => (
          <div key={idx} className="finding-card">
            <div className="finding-header">
              <DomainBadge domain={f.domain} />
              {f.severity && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color:
                      f.severity === 'CRITICAL'
                        ? 'var(--severity-critical)'
                        : f.severity === 'HIGH'
                        ? 'var(--severity-high)'
                        : 'var(--text-muted)',
                  }}
                >
                  {f.severity}
                </span>
              )}
            </div>
            <div className="finding-observation">{f.observation}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
