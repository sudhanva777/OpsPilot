import api from './client';
import type {
  Incident,
  IncidentEvent,
  CreateIncidentInput,
  UpdateIncidentInput,
  ChangeIncidentStatusInput,
} from '../../types';

export const incidentsApi = {
  listForProject: async (projectId: string): Promise<Incident[]> => {
    const res = await api.get<Incident[]>(`/api/projects/${projectId}/incidents`);
    return res.data;
  },

  create: async (projectId: string, data: CreateIncidentInput): Promise<Incident> => {
    const res = await api.post<Incident>(`/api/projects/${projectId}/incidents`, data);
    return res.data;
  },

  getById: async (id: string): Promise<Incident> => {
    const res = await api.get<Incident>(`/api/incidents/${id}`);
    return res.data;
  },

  update: async (id: string, data: UpdateIncidentInput): Promise<Incident> => {
    const res = await api.patch<Incident>(`/api/incidents/${id}`, data);
    return res.data;
  },

  changeStatus: async (id: string, data: ChangeIncidentStatusInput): Promise<Incident> => {
    const res = await api.post<Incident>(`/api/incidents/${id}/status`, data);
    return res.data;
  },

  getEvents: async (id: string): Promise<IncidentEvent[]> => {
    const res = await api.get<IncidentEvent[]>(`/api/incidents/${id}/events`);
    return res.data;
  },
};
