import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  FolderGit2,
  ChevronLeft,
  ChevronRight,
  Zap,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import type { Incident } from '../../types';

interface Props {
  collapsed: boolean;
  onToggleCollapse: () => void;
  incidents?: Incident[];
}

export const Sidebar: React.FC<Props> = ({ collapsed, onToggleCollapse, incidents = [] }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const activeIncidents = incidents.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.status));
  const hasCritical = activeIncidents.some((i) => i.severity === 'CRITICAL');

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'OP';

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-left" onClick={() => navigate('/dashboard')}>
          <div className="sidebar-brand-icon">
            <Zap size={18} fill="#ffffff" />
          </div>
          {!collapsed && <h1>OpsPilot</h1>}
        </div>
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {!collapsed && <div className="sidebar-section-title">Operations</div>}

        <NavLink
          to="/dashboard"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          title="Operations Dashboard"
        >
          <LayoutDashboard size={17} />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        <NavLink
          to="/incidents"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          title="Incident Explorer"
        >
          <AlertTriangle size={17} />
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span>Incidents</span>
              {activeIncidents.length > 0 && (
                <span
                  className="badge badge-critical"
                  style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: 'var(--radius-full)' }}
                >
                  {activeIncidents.length}
                </span>
              )}
            </div>
          )}
        </NavLink>

        <NavLink
          to="/projects"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          title="Projects Catalog"
        >
          <FolderGit2 size={17} />
          {!collapsed && <span>Projects</span>}
        </NavLink>
      </nav>

      {/* Footer System Status & User Profile */}
      <div className="sidebar-footer">
        {!collapsed && (
          <div className="system-status-indicator">
            <span
              className={`status-dot ${
                hasCritical ? 'critical' : activeIncidents.length > 0 ? 'warning' : 'healthy'
              }`}
            />
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {hasCritical
                ? 'Critical Degradation'
                : activeIncidents.length > 0
                ? `${activeIncidents.length} Active Incident${activeIncidents.length > 1 ? 's' : ''}`
                : 'Systems Operational'}
            </div>
          </div>
        )}

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-email">{user?.email}</div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              style={{ color: 'var(--text-muted)', padding: '4px' }}
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
