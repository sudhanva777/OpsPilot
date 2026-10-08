import React from 'react';
import type { IncidentSeverity, IncidentStatus, RiskLevel } from '../../types';
import {
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  PlayCircle,
  HelpCircle,
} from 'lucide-react';

export const SeverityBadge: React.FC<{ severity: IncidentSeverity }> = ({ severity }) => {
  const getIcon = () => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertOctagon size={12} strokeWidth={2.5} />;
      case 'HIGH':
        return <AlertTriangle size={12} strokeWidth={2.5} />;
      case 'MEDIUM':
        return <AlertCircle size={12} strokeWidth={2.5} />;
      case 'LOW':
        return <CheckCircle2 size={12} strokeWidth={2.5} />;
      default:
        return null;
    }
  };

  return (
    <span className={`badge badge-${severity.toLowerCase()}`}>
      {getIcon()}
      <span>{severity}</span>
    </span>
  );
};

export const StatusBadge: React.FC<{ status: IncidentStatus }> = ({ status }) => {
  const getIcon = () => {
    switch (status) {
      case 'OPEN':
        return <AlertOctagon size={11} strokeWidth={2.5} />;
      case 'INVESTIGATING':
        return <Clock size={11} strokeWidth={2.5} />;
      case 'MITIGATED':
        return <PlayCircle size={11} strokeWidth={2.5} />;
      case 'RESOLVED':
        return <CheckCircle2 size={11} strokeWidth={2.5} />;
      case 'CLOSED':
        return <CheckCircle2 size={11} strokeWidth={2.5} />;
      default:
        return null;
    }
  };

  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      {getIcon()}
      <span>{status}</span>
    </span>
  );
};

export const RiskBadge: React.FC<{ risk: RiskLevel }> = ({ risk }) => {
  return (
    <span className={`badge badge-${risk.toLowerCase()}`}>
      <span>{risk} RISK</span>
    </span>
  );
};

export const DomainBadge: React.FC<{ domain: string }> = ({ domain }) => {
  const normalized = domain.toLowerCase();
  return (
    <span className={`badge-telemetry badge-telemetry-${normalized}`}>
      {domain}
    </span>
  );
};

export const HypothesisStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'SUPPORTED') {
    return (
      <span className="badge badge-low" style={{ textTransform: 'uppercase' }}>
        <CheckCircle2 size={11} strokeWidth={2.5} />
        SUPPORTED
      </span>
    );
  }
  if (status === 'REJECTED') {
    return (
      <span className="badge badge-critical" style={{ textTransform: 'uppercase' }}>
        <AlertOctagon size={11} strokeWidth={2.5} />
        REJECTED
      </span>
    );
  }
  return (
    <span className="badge badge-medium" style={{ textTransform: 'uppercase' }}>
      <HelpCircle size={11} strokeWidth={2.5} />
      PROPOSED
    </span>
  );
};
