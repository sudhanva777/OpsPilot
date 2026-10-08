import api from './client';
import type {
  Investigation,
  InvestigationEvidence,
  InvestigationHypothesis,
  InvestigationRecommendation,
  AgentRun,
} from '../../types';

export const investigationsApi = {
  start: async (
    incidentId: string,
    options?: Record<string, unknown>,
  ): Promise<Investigation> => {
    const res = await api.post<Investigation>(
      `/api/incidents/${incidentId}/investigations`,
      { options },
    );
    return res.data;
  },

  listForIncident: async (incidentId: string): Promise<Investigation[]> => {
    const res = await api.get<Investigation[]>(
      `/api/incidents/${incidentId}/investigations`,
    );
    return res.data;
  },

  getById: async (id: string): Promise<Investigation> => {
    const res = await api.get<Investigation>(`/api/investigations/${id}`);
    return res.data;
  },

  getEvidence: async (id: string): Promise<InvestigationEvidence[]> => {
    const res = await api.get<InvestigationEvidence[]>(
      `/api/investigations/${id}/evidence`,
    );
    return res.data;
  },

  getHypotheses: async (id: string): Promise<InvestigationHypothesis[]> => {
    const res = await api.get<InvestigationHypothesis[]>(
      `/api/investigations/${id}/hypotheses`,
    );
    return res.data;
  },

  getRecommendation: async (
    id: string,
  ): Promise<InvestigationRecommendation | null> => {
    const res = await api.get<InvestigationRecommendation | null>(
      `/api/investigations/${id}/recommendation`,
    );
    return res.data;
  },

  getRuns: async (id: string): Promise<AgentRun[]> => {
    const res = await api.get<AgentRun[]>(`/api/investigations/${id}/runs`);
    return res.data;
  },
};
