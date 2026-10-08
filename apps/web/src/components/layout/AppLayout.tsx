import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';
import { projectsApi } from '../../services/api/projectsApi';
import { incidentsApi } from '../../services/api/incidentsApi';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  // Fetch projects to load global incidents
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const { data: allIncidents = [] } = useQuery({
    queryKey: ['dashboard-incidents', projects.map((p) => p.id)],
    queryFn: async () => {
      if (projects.length === 0) return [];
      const results = await Promise.all(
        projects.map((p) => incidentsApi.listForProject(p.id)),
      );
      return results.flat();
    },
    enabled: projects.length > 0,
    refetchInterval: 10_000,
  });

  return (
    <div className="app-layout">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        incidents={allIncidents}
      />

      <Topbar
        collapsed={collapsed}
        onOpenCommandPalette={() => setCmdOpen(true)}
        incidents={allIncidents}
      />

      <main className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <Outlet />
      </main>

      <CommandPalette
        isOpen={cmdOpen}
        onClose={() => setCmdOpen(false)}
        incidents={allIncidents}
      />
    </div>
  );
}
