export type User = {
  user_id: number;
  id: number;
  full_name: string;
  email: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  refresh_token_expires_at?: string;
  user: User;
};

export type RefreshResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  refresh_token_expires_at?: string;
};

export type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};
