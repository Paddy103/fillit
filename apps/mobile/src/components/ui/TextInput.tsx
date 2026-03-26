/**
 * TextInput component for the FillIt design system.
 *
 * Supports labels, error/helper text, multiple variants for different
 * field types, and full theme/dark-mode integration.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  Pressable,
  type TextInputProps as RNTextInputProps,
  type ViewStyle,
  type TextStyle,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../theme';
import { type Theme } from '../../theme/types';

/** Input visual variants */
export type TextInputVariant = 'outlined' | 'filled' | 'underlined';

/** Props for the TextInput component */
export interface TextInputProps extends Omit<RNTextInputProps, 'style' | 'placeholderTextColor'> {
  /** Label text displayed above the input */
  readonly label?: string;
  /** Helper text displayed below the input */
  readonly helperText?: string;
  /** Error message — when set, styles the input as an error state */
  readonly error?: string;
  /** Visual variant. Defaults to 'outlined'. */
  readonly variant?: TextInputVariant;
  /** Whether the input is disabled */
  readonly disabled?: boolean;
  /** Render a custom element on the left side of the input */
  readonly leftAdornment?: React.ReactNode;
  /** Render a custom element on the right side of the input */
  readonly rightAdornment?: React.ReactNode;
  /** Additional container style overrides */
  readonly containerStyle?: ViewStyle;
  /** Additional input style overrides */
  readonly inputStyle?: TextStyle;
}

/** State for computing input styles */
interface InputState {
  hasError: boolean;
  focused: boolean;
  disabled: boolean;
}

/** Resolve the border color based on the current input state */
function resolveBorderColor(colors: Theme['colors'], state: InputState): string {
  if (state.hasError) return colors.error;
  if (state.focused) return colors.primary;
  if (state.disabled) return colors.disabled;
  return colors.outline;
}

/** Resolve the background color for the input variant */
function resolveBackgroundColor(
  colors: Theme['colors'],
  variant: TextInputVariant,
  disabled: boolean,
): string {
  if (variant === 'filled') {
    return disabled ? colors.surfaceVariant : colors.surface;
  }
  return 'transparent';
}

/** Build the input container style for the given variant and state */
function buildInputContainerStyle(
  theme: Theme,
  variant: TextInputVariant,
  state: InputState,
): ViewStyle {
  const { colors, spacing, radii } = theme;
  const borderColor = resolveBorderColor(colors, state);
  const backgroundColor = resolveBackgroundColor(colors, variant, state.disabled);
  const borderWidth = state.focused || state.hasError ? 2 : 1;

  const variantStyles: Record<TextInputVariant, ViewStyle> = {
    outlined: { borderWidth, borderColor, borderRadius: radii.md, backgroundColor },
    filled: {
      borderWidth: 0,
      borderBottomWidth: borderWidth,
      borderBottomColor: borderColor,
      borderTopLeftRadius: radii.md,
      borderTopRightRadius: radii.md,
      backgroundColor,
    },
    underlined: {
      borderWidth: 0,
      borderBottomWidth: borderWidth,
      borderBottomColor: borderColor,
      backgroundColor: 'transparent',
    },
  };

  return {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    minHeight: 48,
    ...variantStyles[variant],
  };
}

/** Resolve the label color from the current state */
function resolveLabelColor(colors: Theme['colors'], state: InputState): string {
  if (state.hasError) return colors.error;
  if (state.focused) return colors.primary;
  return colors.onSurfaceVariant;
}

/** Adornment wrapper that hides content from the accessibility tree */
function Adornment({
  children,
  side,
  spacing,
}: {
  children: React.ReactNode;
  side: 'left' | 'right';
  spacing: number;
}) {
  const style = side === 'left' ? { marginRight: spacing } : { marginLeft: spacing };
  return (
    <View style={style} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {children}
    </View>
  );
}

/** Build the base text style for the native input element */
function buildBaseInputStyle(theme: Theme, disabled: boolean): TextStyle {
  const { colors, spacing, typography } = theme;
  return {
    ...typography.bodyMedium,
    color: disabled ? colors.onDisabled : colors.onBackground,
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
  };
}

/** Renders the label text above the input */
function InputLabel({ label, theme, state }: { label: string; theme: Theme; state: InputState }) {
  return (
    <Text
      style={StyleSheet.flatten([
        theme.typography.labelMedium,
        { color: resolveLabelColor(theme.colors, state), marginBottom: theme.spacing.xs },
      ])}
      accessibilityRole="text"
    >
      {label}
    </Text>
  );
}

/** Renders helper or error text below the input */
function BottomText({ text, hasError, theme }: { text: string; hasError: boolean; theme: Theme }) {
  return (
    <Text
      style={StyleSheet.flatten([
        theme.typography.caption,
        {
          color: hasError ? theme.colors.error : theme.colors.onSurfaceVariant,
          marginTop: theme.spacing.xs,
        },
      ])}
      accessibilityRole="text"
      accessibilityLiveRegion={hasError ? 'polite' : 'none'}
    >
      {text}
    </Text>
  );
}

/**
 * Themed text input with label, helper text, and error state.
 *
 * @example
 * ```tsx
 * <TextInput label="Email" placeholder="Enter your email" error={errors.email} />
 * <TextInput label="SA ID Number" variant="filled" helperText="13-digit SA ID" />
 * ```
 */
export function TextInput({
  label,
  helperText,
  error,
  variant = 'outlined',
  disabled = false,
  leftAdornment,
  rightAdornment,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  accessibilityLabel,
  ...rest
}: TextInputProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<RNTextInput>(null);
  const hasError = Boolean(error);
  const state: InputState = { hasError, focused, disabled };

  const handleFocus = useCallback(
    (e: Parameters<NonNullable<RNTextInputProps['onFocus']>>[0]) => {
      setFocused(true);
      onFocus?.(e);
    },
    [onFocus],
  );
  const handleBlur = useCallback(
    (e: Parameters<NonNullable<RNTextInputProps['onBlur']>>[0]) => {
      setFocused(false);
      onBlur?.(e);
    },
    [onBlur],
  );
  const handleContainerPress = useCallback(() => {
    inputRef.current?.focus();
  }, []);
  const bottomText = error ?? helperText;

  return (
    <View style={StyleSheet.flatten([{ marginBottom: theme.spacing.lg }, containerStyle])}>
      {label ? <InputLabel label={label} theme={theme} state={state} /> : null}
      <Pressable
        onPress={handleContainerPress}
        style={buildInputContainerStyle(theme, variant, state)}
        accessibilityRole="none"
      >
        {leftAdornment ? (
          <Adornment side="left" spacing={theme.spacing.sm}>
            {leftAdornment}
          </Adornment>
        ) : null}
        <RNTextInput
          ref={inputRef}
          style={StyleSheet.flatten([buildBaseInputStyle(theme, disabled), inputStyle])}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ disabled }}
          {...rest}
        />
        {rightAdornment ? (
          <Adornment side="right" spacing={theme.spacing.sm}>
            {rightAdornment}
          </Adornment>
        ) : null}
      </Pressable>
      {bottomText ? <BottomText text={bottomText} hasError={hasError} theme={theme} /> : null}
    </View>
  );
}

TextInput.displayName = 'TextInput';
