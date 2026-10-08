import React from 'react';
import { ShieldAlert, ShieldCheck, AlertCircle } from 'lucide-react';

interface Props {
  confidence: number;
  factors?: string[];
  size?: 'sm' | 'md' | 'lg';
}

export const ConfidenceMeter: React.FC<Props> = ({ confidence, factors = [], size = 'md' }) => {
  const percentage = Math.round(confidence * 100);

  const getTier = () => {
    if (confidence >= 0.8) {
      return {
        label: 'High Confidence',
        color: '#10b981',
        icon: <ShieldCheck size={14} color="#10b981" />,
      };
    }
    if (confidence >= 0.6) {
      return {
        label: 'Probable / Likely',
        color: '#3b82f6',
        icon: <AlertCircle size={14} color="#3b82f6" />,
      };
    }
    if (confidence >= 0.4) {
      return {
        label: 'Moderate Evidence',
        color: '#eab308',
        icon: <AlertCircle size={14} color="#eab308" />,
      };
    }
    return {
      label: 'Inconclusive / Low Certainty',
      color: '#f43f5e',
      icon: <ShieldAlert size={14} color="#f43f5e" />,
    };
  };

  const tier = getTier();

  if (size === 'sm') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div className="confidence-bar-bg" style={{ width: 60, height: 5 }}>
          <div
            className="confidence-bar-fill"
            style={{ width: `${percentage}%`, background: tier.color }}
          />
        </div>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
          {percentage}%
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="confidence-gauge-container">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
            {tier.icon}
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {tier.label}
            </span>
          </div>
          <div className="confidence-bar-bg">
            <div
              className="confidence-bar-fill"
              style={{
                width: `${percentage}%`,
                background: `linear-gradient(90deg, #3b82f6, ${tier.color})`,
              }}
            />
          </div>
        </div>
        <div className="confidence-metric">{percentage}%</div>
      </div>

      {factors.length > 0 && (
        <ul className="confidence-factors-list" style={{ marginTop: '10px' }}>
          {factors.map((factor, idx) => (
            <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.78rem' }}>
              <span style={{ color: tier.color, lineHeight: 1 }}>•</span>
              <span>{factor}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
