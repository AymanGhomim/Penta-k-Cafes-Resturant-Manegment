import { API_ENDPOINTS } from '@/services/api-endpoints';
import { httpClient } from '@/services/http-client';
import type { Plan } from '@/types/platform.types';

type BackendPlan = Omit<Plan, 'price'> & { price: number | string; features: string[] };
type Envelope<T> = { success: boolean; data: T };

const normalize = (plan: BackendPlan): Plan => ({ ...plan, price: Number(plan.price) });

export const platformPlansApiService = {
  async list() { const response = await httpClient.get<Envelope<BackendPlan[]>>(API_ENDPOINTS.platform.plans); return response.data.data.map(normalize); },
  async create(plan: Plan) { const response = await httpClient.post<Envelope<BackendPlan>>(API_ENDPOINTS.platform.plans, plan); return normalize(response.data.data); },
  async update(id: string, plan: Plan) { const response = await httpClient.patch<Envelope<BackendPlan>>(`${API_ENDPOINTS.platform.plans}/${id}`, plan); return normalize(response.data.data); },
  async remove(id: string) { await httpClient.delete(`${API_ENDPOINTS.platform.plans}/${id}`); },
};
