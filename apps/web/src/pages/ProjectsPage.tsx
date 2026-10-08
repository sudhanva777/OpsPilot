import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../services/api/projectsApi';
import { EmptyState } from '../components/ui/EmptyState';
import { timeAgo, getErrorMessage } from '../utils';
import type { CreateProjectInput } from '../types';
import { FolderGit2, Plus, Search, ArrowRight, X } from 'lucide-react';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  if (isLoading) {
    return (
      <div className="page-container">
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
          Loading projects catalog...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Unable to load projects</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>{getErrorMessage(error)}</p>
          <button
            className="btn btn-primary"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['projects'] })}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="page-container">
      <div className="page-header page-header-actions">
        <div>
          <h1 className="page-title">Projects Catalog</h1>
          <p className="page-subtitle">Production services and architectural domains managed by OpsPilot</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={15} />
          <span>New Project</span>
        </button>
      </div>

      {projects.length > 0 && (
        <div
          className="card"
          style={{
            padding: '12px 18px',
            marginBottom: 'var(--space-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Search size={15} color="var(--text-muted)" />
          <input
            className="cmd-palette-input"
            placeholder="Search projects by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: '0.86rem' }}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<FolderGit2 size={24} />}
            title={projects.length === 0 ? 'No Projects Configured' : 'No Matching Projects'}
            description={
              projects.length === 0
                ? 'Create your first project to organize telemetry, services, and production incident management.'
                : 'No projects match your current search query.'
            }
            action={
              projects.length === 0
                ? {
                    label: 'Create Project',
                    onClick: () => setShowCreate(true),
                  }
                : undefined
            }
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filtered.map((project) => (
            <div
              key={project.id}
              className="card stat-card"
              style={{ cursor: 'pointer', padding: '18px 22px' }}
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {project.name}
                  </h3>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.78rem',
                      color: 'var(--brand-primary)',
                      marginTop: '2px',
                    }}
                  >
                    {project.slug}
                  </div>
                </div>
                <ArrowRight size={15} color="var(--text-muted)" />
              </div>

              {project.description && (
                <p
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.84rem',
                    margin: '12px 0',
                    lineHeight: 1.5,
                  }}
                >
                  {project.description}
                </p>
              )}

              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 'auto', paddingTop: '10px' }}>
                Created {timeAgo(project.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ['projects'] });
          }}
        />
      )}
    </div>
  );
}

function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (input: CreateProjectInput) => projectsApi.create(input),
    onSuccess: onCreated,
    onError: (err) => setError(getErrorMessage(err)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    mutation.mutate({ name: name.trim(), description: description.trim() || undefined });
  };

  return (
    <div className="cmd-palette-backdrop" onClick={onClose}>
      <div className="cmd-palette-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-primary)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Create New Project</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {error && <div className="alert alert-error" style={{ marginBottom: '14px' }}>{error}</div>}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Project Name *
            </label>
            <input
              className="cmd-palette-input"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-primary)',
              }}
              placeholder="e.g. Core Banking API"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Description
            </label>
            <textarea
              className="cmd-palette-input"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-primary)',
                minHeight: 80,
                resize: 'vertical',
              }}
              placeholder="Optional description of system architecture or ownership"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending || !name.trim()}>
              {mutation.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
