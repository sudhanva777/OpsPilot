import React from 'react';
import type { Incident } from '../../types';
import type { InvestigationEvidence } from '../../types/investigation';
import { ArrowDown, Server, Database, Globe, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  incident: Incident;
  evidence?: InvestigationEvidence[];
}

export const ServiceTopologyView: React.FC<Props> = ({ incident, evidence = [] }) => {
  const serviceName = incident.service || 'application-service';

  // Check health evidence to detect failing dependencies
  const healthEv = evidence.find((e) => e.type === 'HEALTH');
  const dbEv = evidence.find((e) => e.type === 'DATABASE');

  const isDbDegraded =
    dbEv?.metadata?.pool_utilization !== undefined &&
    Number(dbEv.metadata.pool_utilization) > 0.8;

  // Detect downstream dependency names from logs or health checks
  const depNames: string[] = [];
  if (healthEv?.metadata?.checks && typeof healthEv.metadata.checks === 'object') {
    Object.keys(healthEv.metadata.checks).forEach((k) => {
      if (!k.includes(serviceName) && !k.includes('http')) {
        depNames.push(k);
      }
    });
  }

  const downstreamDeps = depNames.length > 0 ? depNames.slice(0, 3) : ['auth-service', 'inventory-service'];

  return (
    <div className="card" style={{ padding: '24px', marginBottom: 'var(--space-xl)' }}>
      <div style={{ marginBottom: '18px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Service Dependency Topology
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          Correlated call graph isolating symptom service from root-cause upstream/downstream components.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          padding: '20px 0',
        }}
      >
        {/* Tier 1: Client Ingress */}
        <div
          style={{
            padding: '10px 20px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}
        >
          <Globe size={15} color="#3b82f6" />
          <span>API Gateway Ingress</span>
          <CheckCircle2 size={13} color="#10b981" />
        </div>

        <ArrowDown size={16} color="var(--text-muted)" />

        {/* Tier 2: Affected / Symptom Service */}
        <div
          style={{
            padding: '14px 24px',
            background: 'rgba(244, 63, 94, 0.08)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 0 16px rgba(244, 63, 94, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: 260,
            justifyContent: 'center',
          }}
        >
          <Server size={18} color="var(--severity-critical)" />
          <div>
            <div style={{ fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
              {serviceName}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--severity-critical)', marginTop: '2px' }}>
              ● Degradation Detected (Symptom Service)
            </div>
          </div>
        </div>

        <ArrowDown size={16} color="var(--text-muted)" />

        {/* Tier 3: Downstream Dependencies & Datastores */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: '4px',
          }}
        >
          {downstreamDeps.map((dep, idx) => (
            <div
              key={idx}
              style={{
                padding: '10px 16px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
              }}
            >
              <Layers size={14} color="#c084fc" />
              <span style={{ fontFamily: 'var(--font-mono)' }}>{dep}</span>
            </div>
          ))}

          <div
            style={{
              padding: '10px 16px',
              background: isDbDegraded ? 'rgba(244, 63, 94, 0.08)' : 'var(--bg-tertiary)',
              border: `1px solid ${isDbDegraded ? 'rgba(244, 63, 94, 0.3)' : 'var(--border-primary)'}`,
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.82rem',
              color: isDbDegraded ? 'var(--severity-critical)' : 'var(--text-secondary)',
            }}
          >
            <Database size={14} color={isDbDegraded ? 'var(--severity-critical)' : '#fbbf24'} />
            <span>Primary Datastore</span>
            {isDbDegraded ? <AlertCircle size={13} /> : <CheckCircle2 size={13} color="#10b981" />}
          </div>
        </div>
      </div>
    </div>
  );
};
