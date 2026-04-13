export interface AuthEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

export interface LoginUser {
  id: number;
  phone: string;
  role: number;
}

export interface LoginData {
  access_token: string;
  refresh_token: string;
  access_expires_in: number;
  refresh_expires_in: number;
  user: LoginUser;
}
