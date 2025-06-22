// frontend/src/services/api.ts
import axios, { AxiosResponse } from 'axios';
import {
  User,
  Group,
  Bill,
  Settlement,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  CreateGroupRequest,
  CreateBillRequest,
  SettlementResult,
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data: LoginRequest): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/login', data),

  register: (data: RegisterRequest): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/register', data),

  refreshToken: (): Promise<AxiosResponse<{ token: string }>> =>
    api.post('/auth/refresh'),

  getProfile: (): Promise<AxiosResponse<{ user: User }>> =>
    api.get('/profile'),
};

// Groups API
export const groupsAPI = {
  getGroups: (): Promise<AxiosResponse<{ groups: Group[] }>> =>
    api.get('/groups'),

  getGroup: (id: number): Promise<AxiosResponse<{ group: Group }>> =>
    api.get(`/groups/${id}`),

  createGroup: (data: CreateGroupRequest): Promise<AxiosResponse<{ group: Group }>> =>
    api.post('/groups', data),

  updateGroup: (id: number, data: CreateGroupRequest): Promise<AxiosResponse<{ group: Group }>> =>
    api.put(`/groups/${id}`, data),

  deleteGroup: (id: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/groups/${id}`),

  getMembers: (id: number): Promise<AxiosResponse<{ members: any[] }>> =>
    api.get(`/groups/${id}/members`),

  addMember: (id: number, email: string): Promise<AxiosResponse<{ message: string }>> => {
    console.log('API: Adding member', { id, email });
    return api.post(`/groups/${id}/members`, { email });
  },

  removeMember: (groupId: number, userId: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/groups/${groupId}/members/${userId}`),
};

// Bills API
export const billsAPI = {
  getBills: (groupId: number, status?: string): Promise<AxiosResponse<{ bills: Bill[] }>> => {
    const params = new URLSearchParams({ group_id: groupId.toString() });
    if (status) params.append('status', status);
    return api.get(`/bills?${params}`);
  },

  getBill: (id: number): Promise<AxiosResponse<{ bill: Bill }>> =>
    api.get(`/bills/${id}`),

  createBill: (data: CreateBillRequest): Promise<AxiosResponse<{ bill: Bill }>> => {
    console.log('API: Creating bill', data);
    return api.post('/bills', data);
  },

  updateBill: (id: number, data: Partial<CreateBillRequest>): Promise<AxiosResponse<{ bill: Bill }>> =>
    api.put(`/bills/${id}`, data),

  deleteBill: (id: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/bills/${id}`),

  finalizeBill: (id: number): Promise<AxiosResponse<{ message: string }>> =>
    api.post(`/bills/${id}/finalize`),

  addItem: (billId: number, item: any): Promise<AxiosResponse<{ item: any }>> =>
    api.post(`/bills/${billId}/items`, item),

  updateItem: (billId: number, itemId: number, item: any): Promise<AxiosResponse<{ item: any }>> =>
    api.put(`/bills/${billId}/items/${itemId}`, item),

  deleteItem: (billId: number, itemId: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/bills/${billId}/items/${itemId}`),
};

// Settlements API
export const settlementsAPI = {
  calculateSettlement: (groupId: number, billIds: number[]): Promise<AxiosResponse<{ settlement: SettlementResult }>> =>
    api.post('/settlements/calculate', { group_id: groupId, bill_ids: billIds }),

  createSettlement: (groupId: number, billIds: number[]): Promise<AxiosResponse<{ settlement: Settlement; calculation: SettlementResult }>> =>
    api.post('/settlements', { group_id: groupId, bill_ids: billIds }),

  getSettlements: (groupId: number, status?: string): Promise<AxiosResponse<{ settlements: Settlement[] }>> => {
    const params = new URLSearchParams({ group_id: groupId.toString() });
    if (status) params.append('status', status);
    return api.get(`/settlements?${params}`);
  },

  getSettlement: (id: number): Promise<AxiosResponse<{ settlement: Settlement }>> =>
    api.get(`/settlements/${id}`),

  confirmSettlement: (id: number): Promise<AxiosResponse<{ message: string }>> =>
    api.post(`/settlements/${id}/confirm`),
};