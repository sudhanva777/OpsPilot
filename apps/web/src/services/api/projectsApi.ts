import api from './client';
import type { Project, CreateProjectInput, UpdateProjectInput } from '../../types';

export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const res = await api.get<Project[]>('/api/projects');
    return res.data;
  },

  getById: async (id: string): Promise<Project> => {
    const res = await api.get<Project>(`/api/projects/${id}`);
    return res.data;
  },

  create: async (data: CreateProjectInput): Promise<Project> => {
    const res = await api.post<Project>('/api/projects', data);
    return res.data;
  },

  update: async (id: string, data: UpdateProjectInput): Promise<Project> => {
    const res = await api.patch<Project>(`/api/projects/${id}`, data);
    return res.data;
  },
};
