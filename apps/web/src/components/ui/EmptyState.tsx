import React from 'react';

interface Props {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<Props> = ({ icon, title, description, action }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      {icon && (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            color: 'var(--text-secondary)',
          }}
        >
          {icon}
        </div>
      )}
      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: 420, lineHeight: 1.5, marginBottom: action ? '20px' : '0' }}>
        {description}
      </p>
      {action && (
        <button className="btn btn-primary btn-sm" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
};
