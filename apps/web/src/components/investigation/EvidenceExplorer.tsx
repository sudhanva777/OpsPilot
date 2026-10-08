import React, { useState } from 'react';
import type { InvestigationEvidence } from '../../types/investigation';
import { DomainBadge } from '../ui/Badge';
import { timeAgo } from '../../utils';
import { Search, Copy, Check } from 'lucide-react';

interface Props {
  evidence: InvestigationEvidence[];
}

export const EvidenceExplorer: React.FC<Props> = ({ evidence }) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const domains = ['ALL', 'LOG', 'HEALTH', 'DATABASE', 'METRIC', 'DEPLOYMENT', 'CONFIGURATION'];

  const filtered = evidence.filter((item) => {
    if (filter !== 'ALL' && item.type !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchContent = item.content.toLowerCase().includes(q);
      const matchSource = item.source.toLowerCase().includes(q);
      if (!matchTitle && !matchContent && !matchSource) return false;
    }
    return true;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      {/* Filters and search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
        <div className="evidence-filter-bar" style={{ margin: 0 }}>
          {domains.map((dom) => (
            <button
              key={dom}
              className={`filter-chip ${filter === dom ? 'active' : ''}`}
              onClick={() => setFilter(dom)}
            >
              {dom}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 200 }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            className="cmd-palette-input"
            placeholder="Search evidence..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: '0.8rem', padding: '4px 8px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-primary)' }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No evidence records found matching the active filter.
        </div>
      ) : (
        <div className="evidence-grid">
          {filtered.map((item) => (
            <div key={item.id} className="evidence-item-card">
              <div className="evidence-item-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DomainBadge domain={item.type} />
                  <span className="evidence-title">{item.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="evidence-timestamp">
                    {timeAgo(item.collectedAt)}
                  </span>
                  <button
                    onClick={() => handleCopy(item.id, item.content)}
                    style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}
                    title="Copy Raw Evidence"
                  >
                    {copiedId === item.id ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              <div className="evidence-source">
                Source: <code>{item.source}</code>
              </div>

              <pre className="evidence-content-pre">
                {item.content}
              </pre>

              {item.metadata && Object.keys(item.metadata).length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {Object.entries(item.metadata).map(([k, v]) => (
                    <span
                      key={k}
                      style={{
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-mono)',
                        background: 'var(--bg-canvas)',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
