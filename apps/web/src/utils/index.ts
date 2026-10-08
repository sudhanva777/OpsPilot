import type { IncidentSeverity, IncidentStatus } from '../types';

/**
 * Format a date string to relative time (e.g., "5m ago", "2h ago", "3d ago").
 */
export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

/**
 * Format a date string to a human-readable timestamp.
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format time only from a date string.
 */
export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Severity display config.
 */
export const SEVERITY_CONFIG: Record<
  IncidentSeverity,
  { color: string; bg: string; icon: string; label: string }
> = {
  CRITICAL: { color: '#ff4757', bg: 'rgba(255,71,87,0.15)', icon: '🔴', label: 'Critical' },
  HIGH: { color: '#ff6b35', bg: 'rgba(255,107,53,0.15)', icon: '🟠', label: 'High' },
  MEDIUM: { color: '#ffa726', bg: 'rgba(255,167,38,0.15)', icon: '🟡', label: 'Medium' },
  LOW: { color: '#66bb6a', bg: 'rgba(102,187,106,0.15)', icon: '🟢', label: 'Low' },
};

/**
 * Status display config.
 */
export const STATUS_CONFIG: Record<
  IncidentStatus,
  { color: string; bg: string; label: string }
> = {
  OPEN: { color: '#ff4757', bg: 'rgba(255,71,87,0.15)', label: 'Open' },
  INVESTIGATING: { color: '#ffa726', bg: 'rgba(255,167,38,0.15)', label: 'Investigating' },
  MITIGATED: { color: '#29b6f6', bg: 'rgba(41,182,246,0.15)', label: 'Mitigated' },
  RESOLVED: { color: '#66bb6a', bg: 'rgba(102,187,106,0.15)', label: 'Resolved' },
  CLOSED: { color: '#78909c', bg: 'rgba(120,144,156,0.15)', label: 'Closed' },
};

/**
 * Extract error message from an Axios error response.
 */
export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}
