import axiosInstance from './axiosInstance';

export interface ApiTokenInfo {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt?: string | null;
  createdAt: string;
  /** Present ONLY in the create response — shown once. */
  token?: string;
}

const integrationsService = {
  listTokens: () => axiosInstance.get('/api-tokens'),
  createToken: (name: string) => axiosInstance.post('/api-tokens', { name }),
  revokeToken: (id: string) => axiosInstance.delete(`/api-tokens/${id}`),
};

export default integrationsService;
