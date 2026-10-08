import React, { useState } from 'react';
import { Search, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { NotificationCenter } from './NotificationCenter';
import type { Incident } from '../../types';

interface Props {
  collapsed: boolean;
  onOpenCommandPalette: () => void;
  incidents?: Incident[];
}

export const Topbar: React.FC<Props> = ({ collapsed, onOpenCommandPalette, incidents = [] }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);

  const activeCount = incidents.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.status)).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <header className={`topbar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="topbar-left">
        <button
          className="topbar-search-trigger"
          onClick={onOpenCommandPalette}
          title="Search or execute command"
        >
          <Search size={14} color="var(--text-muted)" />
          <span>Quick find & commands...</span>
          <span className="kbd-shortcut">{isMac ? '⌘K' : 'Ctrl+K'}</span>
        </button>
      </div>

      <div className="topbar-right">
        {/* Environment indicator */}
        <div className="env-pill">
          <span className="status-dot healthy" />
          <span>Production</span>
        </div>

        {/* Operational Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            className="icon-action-btn"
            onClick={() => setShowNotifs(!showNotifs)}
            title="Operational Alerts"
          >
            <Bell size={16} />
            {activeCount > 0 && <span className="notif-badge-dot" />}
          </button>
          <NotificationCenter
            isOpen={showNotifs}
            onClose={() => setShowNotifs(false)}
            incidents={incidents}
          />
        </div>

        {/* User initials & logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'OP'}
          </div>
          <button
            className="icon-action-btn"
            onClick={handleLogout}
            title="Sign out of OpsPilot"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
};
