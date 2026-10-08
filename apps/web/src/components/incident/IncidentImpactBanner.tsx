import React from 'react';
import type { Incident } from '../../types';
import { timeAgo, formatDate } from '../../utils';
import { Server, Clock, Activity, Zap } from 'lucide-react';

interface Props {
  incident: Incident;
}

export const IncidentImpactBanner: React.FC<Props> = ({ incident }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginBottom: 'var(--space-xl)',
      }}
    >
      <div className="card" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 600 }}>
          <Server size={14} color="#3b82f6" />
          <span>Impacted Service</span>
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
          {incident.service || 'Global Infrastructure'}
        </div>
      </div>

      <div className="card" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 600 }}>
          <Clock size={14} color="#f59e0b" />
          <span>Incident Onset</span>
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
          {timeAgo(incident.createdAt)}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          {formatDate(incident.createdAt)}
        </div>
      </div>

      <div className="card" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 600 }}>
          <Activity size={14} color="#f43f5e" />
          <span>Priority Rating</span>
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
          Tier {incident.severity === 'CRITICAL' ? '1 (P0)' : incident.severity === 'HIGH' ? '2 (P1)' : '3 (P2)'}
        </div>
      </div>

      <div className="card" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 600 }}>
          <Zap size={14} color="#10b981" />
          <span>Investigation Radar</span>
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
          Multi-Domain Active
        </div>
      </div>
    </div>
  );
};
