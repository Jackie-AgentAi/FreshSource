export type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T;
};

export type LoginUser = {
  id: number;
  phone: string;
  role: number;
};

export type LoginData = {
  access_token: string;
  refresh_token: string;
  access_expires_in: number;
  refresh_expires_in: number;
  user: LoginUser;
};
