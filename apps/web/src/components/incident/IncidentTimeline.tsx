import React from 'react';
import type { IncidentEvent } from '../../types';
import { timeAgo, formatDate } from '../../utils';
import { Clock, User } from 'lucide-react';

interface Props {
  events: IncidentEvent[];
}

export const IncidentTimeline: React.FC<Props> = ({ events }) => {
  if (events.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No historical events recorded yet.
      </div>
    );
  }

  const formatEventType = (type: string) => {
    return type.replace(/_/g, ' ');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
      {events.map((evt, idx) => (
        <div
          key={evt.id || idx}
          style={{
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start',
            paddingLeft: '6px',
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px',
            }}
          >
            <Clock size={12} color="var(--brand-primary)" />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  textTransform: 'capitalize',
                }}
              >
                {formatEventType(evt.eventType)}
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {timeAgo(evt.createdAt)} ({formatDate(evt.createdAt)})
              </span>
            </div>

            {evt.actor && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={11} />
                <span>Triggered by {evt.actor.name}</span>
              </div>
            )}

            {evt.metadata && Object.keys(evt.metadata).length > 0 && (
              <pre
                style={{
                  marginTop: '6px',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  overflowX: 'auto',
                }}
              >
                {JSON.stringify(evt.metadata, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
