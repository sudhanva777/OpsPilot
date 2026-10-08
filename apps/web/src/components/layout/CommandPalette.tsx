import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  AlertTriangle,
  FolderGit2,
  Zap,
  ArrowRight,
  X,
} from 'lucide-react';
import type { Incident } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  incidents?: Incident[];
}

export const CommandPalette: React.FC<Props> = ({ isOpen, onClose, incidents = [] }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent, but we can toggle
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const defaultActions = [
    {
      id: 'nav-dashboard',
      title: 'Go to Operations Dashboard',
      category: 'Navigation',
      icon: <LayoutDashboard size={15} />,
      action: () => { navigate('/dashboard'); onClose(); },
    },
    {
      id: 'nav-incidents',
      title: 'Go to Incidents Explorer',
      category: 'Navigation',
      icon: <AlertTriangle size={15} />,
      action: () => { navigate('/incidents'); onClose(); },
    },
    {
      id: 'nav-projects',
      title: 'Go to Projects Catalog',
      category: 'Navigation',
      icon: <FolderGit2 size={15} />,
      action: () => { navigate('/projects'); onClose(); },
    },
  ];

  const incidentActions = incidents.slice(0, 5).map((inc) => ({
    id: `inc-${inc.id}`,
    title: `${inc.title} (${inc.service || 'system'})`,
    category: 'Active Incidents',
    icon: <Zap size={15} color="#f59e0b" />,
    action: () => { navigate(`/incidents/${inc.id}`); onClose(); },
  }));

  const allItems = [...defaultActions, ...incidentActions].filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="cmd-palette-backdrop" onClick={onClose}>
      <div className="cmd-palette-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-palette-search">
          <Search size={18} color="var(--text-muted)" />
          <input
            className="cmd-palette-input"
            placeholder="Type a command or search incidents..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            autoFocus
          />
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="cmd-palette-results">
          {allItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No commands or incidents matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            allItems.map((item, idx) => (
              <div
                key={item.id}
                className={`cmd-palette-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {item.icon}
                  <span>{item.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {item.category}
                  </span>
                  <ArrowRight size={13} color="var(--text-faint)" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
