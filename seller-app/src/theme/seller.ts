import { Platform } from 'react-native';

export const sellerColors = {
  background: '#F5F7FA',
  foreground: '#1A1A1A',
  card: '#FFFFFF',
  border: '#EEEEEE',
  muted: '#999999',
  mutedSoft: '#F8F8F8',
  secondary: '#F5F5F5',
  primary: '#00B578',
  primarySoft: '#E8FBF4',
  success: '#52C41A',
  successSoft: '#F6FFED',
  warning: '#FAAD14',
  warningSoft: '#FFF7E6',
  info: '#1890FF',
  infoSoft: '#E6F4FF',
  destructive: '#FF4D4F',
  destructiveSoft: '#FFF1F0',
  orange: '#FF7A45',
  orangeSoft: '#FFF2E8',
};

export const sellerRadius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const sellerShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  android: {
    elevation: 3,
  },
  default: {},
});
