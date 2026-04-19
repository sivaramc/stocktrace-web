import { api } from './client';
import type {
  AdminRow,
  AppRole,
  FivepaisaSessionResponse,
  LoginResponse,
  Me,
  RegisterRequest,
  ZerodhaSessionResponse,
} from './types';

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/api/auth/login', { email, password });
  return res.data;
}

export async function registerApi(body: RegisterRequest): Promise<Me> {
  const res = await api.post<Me>('/api/auth/register', body);
  return res.data;
}

export async function fetchMe(): Promise<Me> {
  const res = await api.get<Me>('/api/auth/me');
  return res.data;
}

export async function listUsersApi(): Promise<AdminRow[]> {
  const res = await api.get<AdminRow[]>('/api/admin/users');
  return res.data;
}

export async function activateUserApi(id: number): Promise<AdminRow> {
  const res = await api.post<AdminRow>(`/api/admin/users/${id}/activate`);
  return res.data;
}

export async function deactivateUserApi(id: number): Promise<AdminRow> {
  const res = await api.post<AdminRow>(`/api/admin/users/${id}/deactivate`);
  return res.data;
}

export async function changeUserRoleApi(id: number, role: AppRole): Promise<AdminRow> {
  const res = await api.post<AdminRow>(`/api/admin/users/${id}/role`, { role });
  return res.data;
}

export async function fetchZerodhaLoginUrl(): Promise<string> {
  const res = await api.get<{ loginUrl: string }>('/api/trade-on/zerodha/login-url');
  return res.data.loginUrl;
}

export async function exchangeZerodha(requestToken: string): Promise<ZerodhaSessionResponse> {
  const res = await api.post<ZerodhaSessionResponse>('/api/trade-on/zerodha', { requestToken });
  return res.data;
}

export async function exchangeFivepaisa(totp: string, pin: string): Promise<FivepaisaSessionResponse> {
  const res = await api.post<FivepaisaSessionResponse>('/api/trade-on/fivepaisa', { totp, pin });
  return res.data;
}

export interface TradeRequest {
  tradingsymbol: string;
  exchange: string;
  quantity: number;
  orderType?: 'MARKET' | 'LIMIT';
  price?: number;
  product?: string;
  variety?: string;
  validity?: string;
}

export async function placeBuyApi(req: TradeRequest): Promise<unknown> {
  const res = await api.post('/api/trade/buy', req);
  return res.data;
}

export async function placeSellApi(req: TradeRequest): Promise<unknown> {
  const res = await api.post('/api/trade/sell', req);
  return res.data;
}
