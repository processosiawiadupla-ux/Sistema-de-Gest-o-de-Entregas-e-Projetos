import api from './api';

export const projectService = {
  // Obter todos os projetos
  async getAll() {
    const response = await api.get('/projects');
    return response.data;
  },

  // Criar um novo projeto
  async create(projectData: any) {
    const response = await api.post('/projects', projectData);
    return response.data;
  },
};

