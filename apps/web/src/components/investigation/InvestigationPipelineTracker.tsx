import React from 'react';
import { Check, Loader2, Circle, AlertCircle } from 'lucide-react';

interface Props {
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  currentStage?: string;
}

export const InvestigationPipelineTracker: React.FC<Props> = ({ status }) => {
  const stages = [
    { id: 'context', label: 'Context Loaded' },
    { id: 'telemetry', label: 'Multi-Domain Telemetry' },
    { id: 'findings', label: 'Findings Synthesized' },
    { id: 'hypotheses', label: 'Hypotheses Evaluated' },
    { id: 'rca', label: 'RCA Formulated' },
    { id: 'recommendation', label: 'Recommendation Gated' },
  ];

  const getStepState = (idx: number) => {
    if (status === 'COMPLETED') return 'completed';
    if (status === 'FAILED') return idx < 3 ? 'completed' : 'failed';
    if (status === 'RUNNING') return idx < 3 ? 'completed' : idx === 3 ? 'running' : 'pending';
    return 'pending';
  };

  return (
    <div className="pipeline-tracker">
      {stages.map((stage, idx) => {
        const state = getStepState(idx);
        return (
          <React.Fragment key={stage.id}>
            <div className={`pipeline-step ${state}`}>
              <div className="pipeline-step-dot">
                {state === 'completed' ? (
                  <Check size={11} strokeWidth={3} />
                ) : state === 'running' ? (
                  <Loader2 size={11} className="spinner-sm" />
                ) : state === 'failed' ? (
                  <AlertCircle size={11} color="#f43f5e" />
                ) : (
                  <Circle size={6} fill="var(--text-faint)" color="transparent" />
                )}
              </div>
              <span>{stage.label}</span>
            </div>
            {idx < stages.length - 1 && (
              <div className={`pipeline-connector ${state === 'completed' ? 'active' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
