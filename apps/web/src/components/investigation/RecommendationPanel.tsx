import React from 'react';
import type { InvestigationRecommendation } from '../../types/investigation';
import { RiskBadge } from '../ui/Badge';
import { ShieldCheck, Lock, CheckSquare } from 'lucide-react';

interface Props {
  recommendation: InvestigationRecommendation | null | undefined;
}

export const RecommendationPanel: React.FC<Props> = ({ recommendation }) => {
  if (!recommendation) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No mitigation recommendation generated yet.
      </div>
    );
  }

  return (
    <div className="recommendation-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={18} color="var(--brand-primary)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
            Recommended Remediation
          </span>
        </div>
        <RiskBadge risk={recommendation.riskLevel} />
      </div>

      <div className="inv-rec-action">
        {recommendation.action}
      </div>

      <p className="inv-rec-reason">
        {recommendation.reason}
      </p>

      {/* Mitigation Steps Checklist */}
      {recommendation.mitigationSteps && recommendation.mitigationSteps.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
            Mitigation Protocol
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {recommendation.mitigationSteps.map((step, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-canvas)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <CheckSquare size={13} color="var(--brand-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strict Human Approval Gating Banner */}
      <div className="approval-gated-banner">
        <Lock size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
        <div>
          <span>Approval Required: Automated remediation execution is disabled. Human operator sign-off required prior to production rollout.</span>
        </div>
      </div>
    </div>
  );
};
