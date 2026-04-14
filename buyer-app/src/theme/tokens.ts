import { Platform, StyleSheet } from 'react-native';

export const colors = {
  // Brand
  primary: '#1677ff',
  primaryPressed: '#0958d9',
  primarySoft: '#e6f4ff',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#0284c7',

  // Surface
  background: '#f7f8fa',
  surface: '#ffffff',
  surfaceSecondary: '#f5f7fb',
  surfaceDisabled: '#f2f3f5',

  // Text
  text: '#1a1a1a',
  textStrong: '#111827',
  textSecondary: '#666666',
  textMuted: '#999999',
  textDisabled: '#bfbfbf',

  // Border & divider
  border: '#e8e8e8',
  borderStrong: '#d9d9d9',
  divider: '#f0f0f0',

  // Status
  statusPendingBg: '#fff7e6',
  statusPendingText: '#ad6800',
  statusSuccessBg: '#f6ffed',
  statusSuccessText: '#389e0d',
  statusDangerBg: '#fff1f0',
  statusDangerText: '#cf1322',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const radius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
  round: 9999,
};

export const typography = {
  h1: 28,
  h2: 24,
  h3: 20,
  h4: 18,
  title: 18,
  subtitle: 16,
  body: 15,
  caption: 13,
  small: 12,
  micro: 11,
};

export const lineHeight = {
  h1: 36,
  h2: 32,
  h3: 28,
  h4: 24,
  title: 24,
  subtitle: 22,
  body: 22,
  caption: 18,
  small: 16,
  micro: 14,
};

export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
};

export const sizes = {
  headerHeight: 44,
  tabBarHeight: 56,
  actionBarHeight: 52,
  inputHeight: 44,
  buttonHeight: 44,
};

export const elevation = {
  none: {},
  sm: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
    },
    android: {
      elevation: 8,
    },
    default: {},
  }),
};

export const zIndex = {
  base: 1,
  header: 10,
  sticky: 20,
  overlay: 50,
  modal: 100,
};

export const commonStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...elevation.sm,
  },
});

export const tokens = {
  colors,
  spacing,
  radius,
  typography,
  lineHeight,
  iconSize,
  sizes,
  elevation,
  zIndex,
};
