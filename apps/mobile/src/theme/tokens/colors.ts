/**
 * Color tokens for the FillIt design system.
 *
 * Organized by semantic purpose: primary actions, surfaces, text, status colors.
 * Each color set provides light and dark mode variants.
 */

/** The shape of a complete color token set */
export interface ColorTokens {
  // Brand / Primary
  readonly primary: string;
  readonly primaryLight: string;
  readonly primaryDark: string;
  readonly onPrimary: string;

  // Secondary
  readonly secondary: string;
  readonly secondaryLight: string;
  readonly secondaryDark: string;
  readonly onSecondary: string;

  // Surfaces
  readonly background: string;
  readonly surface: string;
  readonly surfaceVariant: string;
  readonly onBackground: string;
  readonly onSurface: string;
  readonly onSurfaceVariant: string;

  // Status
  readonly error: string;
  readonly errorLight: string;
  readonly onError: string;
  readonly success: string;
  readonly successLight: string;
  readonly onSuccess: string;
  readonly warning: string;
  readonly warningLight: string;
  readonly onWarning: string;
  readonly info: string;
  readonly infoLight: string;
  readonly onInfo: string;

  // Borders & Dividers
  readonly outline: string;
  readonly outlineVariant: string;
  readonly divider: string;

  // Overlays & Shadows
  readonly scrim: string;
  readonly shadow: string;

  // Disabled states
  readonly disabled: string;
  readonly onDisabled: string;
}

/** Light mode color palette */
export const lightColors: ColorTokens = {
  // Brand / Primary
  primary: '#0066CC',
  primaryLight: '#338FE6',
  primaryDark: '#004C99',
  onPrimary: '#FFFFFF',

  // Secondary
  secondary: '#5C6BC0',
  secondaryLight: '#8E99D6',
  secondaryDark: '#3F4FA3',
  onSecondary: '#FFFFFF',

  // Surfaces
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceVariant: '#E8E8E8',
  onBackground: '#1A1A1A',
  onSurface: '#1A1A1A',
  onSurfaceVariant: '#666666',

  // Status
  error: '#D32F2F',
  errorLight: '#EF5350',
  onError: '#FFFFFF',
  success: '#2E7D32',
  successLight: '#4CAF50',
  onSuccess: '#FFFFFF',
  warning: '#F57C00',
  warningLight: '#FFB74D',
  onWarning: '#FFFFFF',
  info: '#1976D2',
  infoLight: '#64B5F6',
  onInfo: '#FFFFFF',

  // Borders & Dividers
  outline: '#CCCCCC',
  outlineVariant: '#E0E0E0',
  divider: '#E0E0E0',

  // Overlays & Shadows
  scrim: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.15)',

  // Disabled states
  disabled: '#BDBDBD',
  onDisabled: '#757575',
};

/** Dark mode color palette */
export const darkColors: ColorTokens = {
  // Brand / Primary
  primary: '#5EA6FF',
  primaryLight: '#8DC4FF',
  primaryDark: '#3D8CE6',
  onPrimary: '#002952',

  // Secondary
  secondary: '#9FA8DA',
  secondaryLight: '#C5CAE9',
  secondaryDark: '#7986CB',
  onSecondary: '#1A237E',

  // Surfaces
  background: '#121212',
  surface: '#1E1E1E',
  surfaceVariant: '#2C2C2C',
  onBackground: '#E0E0E0',
  onSurface: '#E0E0E0',
  onSurfaceVariant: '#AAAAAA',

  // Status
  error: '#EF5350',
  errorLight: '#E57373',
  onError: '#1A0000',
  success: '#66BB6A',
  successLight: '#81C784',
  onSuccess: '#003300',
  warning: '#FFB74D',
  warningLight: '#FFCC80',
  onWarning: '#331A00',
  info: '#64B5F6',
  infoLight: '#90CAF9',
  onInfo: '#002952',

  // Borders & Dividers
  outline: '#555555',
  outlineVariant: '#3A3A3A',
  divider: '#333333',

  // Overlays & Shadows
  scrim: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(0, 0, 0, 0.4)',

  // Disabled states
  disabled: '#555555',
  onDisabled: '#888888',
};
