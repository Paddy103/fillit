/**
 * Spacing scale tokens for the FillIt design system.
 *
 * Uses a 4dp base unit grid for consistent spacing across all UI elements.
 * Also includes border radius and elevation tokens for surface treatments.
 */

/** Spacing scale based on 4dp grid (values in dp) */
export const spacing = {
  /** 0dp — no spacing */
  none: 0,
  /** 2dp — micro spacing (icon gaps, inline elements) */
  '2xs': 2,
  /** 4dp — extra-small spacing (tight padding, small gaps) */
  xs: 4,
  /** 8dp — small spacing (default padding, list item gaps) */
  sm: 8,
  /** 12dp — medium-small spacing (section padding) */
  md: 12,
  /** 16dp — medium spacing (card padding, screen margins) */
  lg: 16,
  /** 20dp — medium-large spacing */
  xl: 20,
  /** 24dp — large spacing (section gaps) */
  '2xl': 24,
  /** 32dp — extra-large spacing (major section gaps) */
  '3xl': 32,
  /** 40dp — double extra-large spacing */
  '4xl': 40,
  /** 48dp — triple extra-large spacing */
  '5xl': 48,
  /** 64dp — maximum spacing (page margins) */
  '6xl': 64,
} as const;

/** Border radius tokens (in dp) */
export const radii = {
  /** 0dp — sharp corners */
  none: 0,
  /** 4dp — subtle rounding */
  sm: 4,
  /** 8dp — default rounding */
  md: 8,
  /** 12dp — moderate rounding */
  lg: 12,
  /** 16dp — strong rounding */
  xl: 16,
  /** 24dp — pill-like rounding */
  '2xl': 24,
  /** 9999dp — full circle / pill shape */
  full: 9999,
} as const;

/** Elevation / shadow tokens for surface hierarchy */
export const elevations = {
  none: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
} as const;

/** The shape of the spacing token set */
export type SpacingTokens = typeof spacing;

/** The shape of the border radius token set */
export type RadiiTokens = typeof radii;

/** The shape of a single elevation token */
export type ElevationToken = {
  readonly shadowColor: string;
  readonly shadowOffset: { readonly width: number; readonly height: number };
  readonly shadowOpacity: number;
  readonly shadowRadius: number;
  readonly elevation: number;
};

/** The shape of the elevation token set */
export type ElevationTokens = typeof elevations;
