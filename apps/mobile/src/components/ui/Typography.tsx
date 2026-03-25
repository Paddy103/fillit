/**
 * Typography components for the FillIt design system.
 *
 * Provides semantically named text components (DisplayText, Heading, Title,
 * Body, Label, Caption) that consume theme typography tokens and support
 * dark/light mode via the ThemeProvider.
 */

import React from 'react';
import { Text, type TextProps, type TextStyle, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { type TypographyTokens } from '../../theme/tokens/typography';

/** Typography variant names matching the theme typography token keys */
export type TypographyVariant = keyof TypographyTokens;

/** Semantic color names that map to theme color tokens */
export type TypographyColor =
  | 'default'
  | 'secondary'
  | 'primary'
  | 'error'
  | 'success'
  | 'warning'
  | 'info'
  | 'disabled';

/** Alignment options */
export type TypographyAlign = 'auto' | 'left' | 'right' | 'center' | 'justify';

/** Props shared by all typography components */
export interface TypographyProps extends Omit<TextProps, 'style'> {
  /** Text content */
  readonly children: React.ReactNode;
  /** Semantic color. Defaults to 'default' (onBackground). */
  readonly color?: TypographyColor;
  /** Text alignment */
  readonly align?: TypographyAlign;
  /** Additional style overrides */
  readonly style?: TextStyle;
}

/** Base typography component that renders a themed Text */
function TypographyBase({
  variant,
  color = 'default',
  align,
  style,
  children,
  accessibilityRole,
  ...rest
}: TypographyProps & { readonly variant: TypographyVariant }) {
  const { theme } = useTheme();
  const tokenStyle = theme.typography[variant];

  const colorMap: Record<TypographyColor, string> = {
    default: theme.colors.onBackground,
    secondary: theme.colors.onSurfaceVariant,
    primary: theme.colors.primary,
    error: theme.colors.error,
    success: theme.colors.success,
    warning: theme.colors.warning,
    info: theme.colors.info,
    disabled: theme.colors.onDisabled,
  };

  const combinedStyle: TextStyle = {
    ...tokenStyle,
    color: colorMap[color],
    ...(align ? { textAlign: align } : undefined),
    ...StyleSheet.flatten(style),
  };

  return (
    <Text accessibilityRole={accessibilityRole ?? 'text'} style={combinedStyle} {...rest}>
      {children}
    </Text>
  );
}

/** Large display text — hero sections, splash screens */
export function DisplayLarge(props: TypographyProps) {
  return <TypographyBase variant="displayLarge" accessibilityRole="header" {...props} />;
}
DisplayLarge.displayName = 'DisplayLarge';

/** Medium display text */
export function DisplayMedium(props: TypographyProps) {
  return <TypographyBase variant="displayMedium" accessibilityRole="header" {...props} />;
}
DisplayMedium.displayName = 'DisplayMedium';

/** Large heading — screen titles */
export function HeadingLarge(props: TypographyProps) {
  return <TypographyBase variant="headlineLarge" accessibilityRole="header" {...props} />;
}
HeadingLarge.displayName = 'HeadingLarge';

/** Medium heading — section titles */
export function HeadingMedium(props: TypographyProps) {
  return <TypographyBase variant="headlineMedium" accessibilityRole="header" {...props} />;
}
HeadingMedium.displayName = 'HeadingMedium';

/** Large title — card titles, list headers */
export function TitleLarge(props: TypographyProps) {
  return <TypographyBase variant="titleLarge" {...props} />;
}
TitleLarge.displayName = 'TitleLarge';

/** Medium title — smaller section titles */
export function TitleMedium(props: TypographyProps) {
  return <TypographyBase variant="titleMedium" {...props} />;
}
TitleMedium.displayName = 'TitleMedium';

/** Large body text — primary content */
export function BodyLarge(props: TypographyProps) {
  return <TypographyBase variant="bodyLarge" {...props} />;
}
BodyLarge.displayName = 'BodyLarge';

/** Medium body text — standard content */
export function BodyMedium(props: TypographyProps) {
  return <TypographyBase variant="bodyMedium" {...props} />;
}
BodyMedium.displayName = 'BodyMedium';

/** Small body text — secondary content */
export function BodySmall(props: TypographyProps) {
  return <TypographyBase variant="bodySmall" {...props} />;
}
BodySmall.displayName = 'BodySmall';

/** Large label — button labels, form labels */
export function LabelLarge(props: TypographyProps) {
  return <TypographyBase variant="labelLarge" {...props} />;
}
LabelLarge.displayName = 'LabelLarge';

/** Medium label — secondary labels */
export function LabelMedium(props: TypographyProps) {
  return <TypographyBase variant="labelMedium" {...props} />;
}
LabelMedium.displayName = 'LabelMedium';

/** Small label — micro labels, overlines */
export function LabelSmall(props: TypographyProps) {
  return <TypographyBase variant="labelSmall" {...props} />;
}
LabelSmall.displayName = 'LabelSmall';

/** Caption text — timestamps, metadata, fine print */
export function Caption(props: TypographyProps) {
  return <TypographyBase variant="caption" {...props} />;
}
Caption.displayName = 'Caption';
