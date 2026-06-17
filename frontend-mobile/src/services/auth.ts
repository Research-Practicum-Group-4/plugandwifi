import { apiPost } from './api';
import type { LoginResponse } from '../types/auth';

export type RegisterPayload = {
  full_name: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export async function registerUser(payload: RegisterPayload): Promise<{ message: string }> {
  return apiPost<{ message: string }>('/api/auth/register', payload);
}

export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  return apiPost<LoginResponse>('/api/auth/login', payload);
}
