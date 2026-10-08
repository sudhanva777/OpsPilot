import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import type { Incident } from '../../types';
import { timeAgo } from '../../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  incidents?: Incident[];
}

export const NotificationCenter: React.FC<Props> = ({ isOpen, onClose, incidents = [] }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const activeIncidents = incidents.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.status));

  return (
    <div className="notif-popover">
      <div className="notif-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#ffffff' }}>Operational Alerts</span>
          <span className="badge badge-critical" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
            {activeIncidents.length} active
          </span>
        </div>
        <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
          <X size={15} />
        </button>
      </div>

      <div className="notif-list">
        {activeIncidents.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={24} color="#10b981" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>All Clear</div>
            <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>No active production alerts triggered.</div>
          </div>
        ) : (
          activeIncidents.map((inc) => (
            <div
              key={inc.id}
              className="notif-item"
              onClick={() => {
                navigate(`/incidents/${inc.id}`);
                onClose();
              }}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ marginTop: '2px' }}>
                {inc.severity === 'CRITICAL' ? (
                  <AlertOctagon size={16} color="var(--severity-critical)" />
                ) : (
                  <ShieldAlert size={16} color="var(--severity-high)" />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {inc.title}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{inc.service || 'infrastructure'}</span>
                  <span>{timeAgo(inc.createdAt)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
