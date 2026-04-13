import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const ACCESS_TOKEN_KEY = 'fm_buyer_access_token';
const REFRESH_TOKEN_KEY = 'fm_buyer_refresh_token';
const USER_PHONE_KEY = 'fm_buyer_phone';
const USER_ROLE_KEY = 'fm_buyer_role';

type AuthState = {
  initialized: boolean;
  accessToken: string;
  refreshToken: string;
  phone: string;
  role: number;
  hydrate: () => Promise<void>;
  setAuth: (payload: { accessToken: string; refreshToken: string; phone: string; role: number }) => Promise<void>;
  clearAuth: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  initialized: false,
  accessToken: '',
  refreshToken: '',
  phone: '',
  role: 0,
  hydrate: async () => {
    const [accessToken, refreshToken, phone, roleRaw] = await Promise.all([
      AsyncStorage.getItem(ACCESS_TOKEN_KEY),
      AsyncStorage.getItem(REFRESH_TOKEN_KEY),
      AsyncStorage.getItem(USER_PHONE_KEY),
      AsyncStorage.getItem(USER_ROLE_KEY),
    ]);
    set({
      initialized: true,
      accessToken: accessToken || '',
      refreshToken: refreshToken || '',
      phone: phone || '',
      role: Number(roleRaw || 0),
    });
  },
  setAuth: async ({ accessToken, refreshToken, phone, role }) => {
    await Promise.all([
      AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
      AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
      AsyncStorage.setItem(USER_PHONE_KEY, phone),
      AsyncStorage.setItem(USER_ROLE_KEY, String(role)),
    ]);
    set({ accessToken, refreshToken, phone, role });
  },
  clearAuth: async () => {
    await Promise.all([
      AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
      AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
      AsyncStorage.removeItem(USER_PHONE_KEY),
      AsyncStorage.removeItem(USER_ROLE_KEY),
    ]);
    set({ accessToken: '', refreshToken: '', phone: '', role: 0 });
  },
}));
