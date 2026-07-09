/**
 * @file constants/theme.ts
 * @description 主题系统：颜色、字体、间距。支持明暗双主题。
 *              采用自定义 StyleSheet 主题，不引入重型 UI 库。
 */

/** 主题色板 */
export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;

  background: string;
  surface: string;
  surfaceVariant: string;
  card: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textOnPrimary: string;

  border: string;
  divider: string;

  error: string;
  warning: string;
  success: string;
  info: string;

  overlay: string;
  shadow: string;

  tagBg: string;
  chipBg: string;
}

/** 字体尺寸 */
export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  title: 28,
} as const;

/** 字重 */
export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** 间距系统（4 的倍数） */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** 圆角 */
export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

/** 阴影 */
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

/** 浅色主题 */
export const lightColors: ThemeColors = {
  primary: '#5B8DEF',
  primaryLight: '#E8F0FE',
  primaryDark: '#3B6FD8',
  accent: '#7C5CE6',

  background: '#F5F6FA',
  surface: '#FFFFFF',
  surfaceVariant: '#F0F1F5',
  card: '#FFFFFF',

  textPrimary: '#1A1D26',
  textSecondary: '#6B7180',
  textTertiary: '#A0A5B4',
  textOnPrimary: '#FFFFFF',

  border: '#E5E7EE',
  divider: '#EFEFF5',

  error: '#E5484D',
  warning: '#F5A623',
  success: '#30B46C',
  info: '#5B8DEF',

  overlay: 'rgba(0,0,0,0.4)',
  shadow: '#1A1D26',

  tagBg: '#EEF2FF',
  chipBg: '#F0F1F5',
};

/** 深色主题 */
export const darkColors: ThemeColors = {
  primary: '#7BA3F5',
  primaryLight: '#2A3550',
  primaryDark: '#5B8DEF',
  accent: '#9D80FF',

  background: '#0F1115',
  surface: '#1A1D26',
  surfaceVariant: '#252936',
  card: '#1F2330',

  textPrimary: '#F0F2F8',
  textSecondary: '#A0A5B4',
  textTertiary: '#6B7180',
  textOnPrimary: '#0F1115',

  border: '#2E3340',
  divider: '#262A36',

  error: '#FF6B6B',
  warning: '#FFB946',
  success: '#4ADE80',
  info: '#7BA3F5',

  overlay: 'rgba(0,0,0,0.6)',
  shadow: '#000000',

  tagBg: '#2A3354',
  chipBg: '#252936',
};

/** 完整主题对象 */
export interface AppTheme {
  colors: ThemeColors;
  dark: boolean;
}

export const lightTheme: AppTheme = { colors: lightColors, dark: false };
export const darkTheme: AppTheme = { colors: darkColors, dark: true };

/** 默认分类色板（创建分类时随机取用） */
export const CATEGORY_COLORS = [
  '#5B8DEF',
  '#7C5CE6',
  '#30B46C',
  '#F5A623',
  '#E5484D',
  '#00B5D8',
  '#EC4899',
  '#8B5CF6',
] as const;
