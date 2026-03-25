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

/**
 * Themed text input with label, helper text, and error state.
 *
 * @example
 * ```tsx
 * <TextInput
 *   label="Email"
 *   placeholder="Enter your email"
 *   keyboardType="email-address"
 *   error={errors.email}
 * />
 * <TextInput
 *   label="SA ID Number"
 *   variant="filled"
 *   helperText="13-digit South African ID number"
 *   keyboardType="numeric"
 *   maxLength={13}
 * />
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

  const { colors, spacing, radii, typography } = theme;

  const hasError = Boolean(error);

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

  // Determine border/background color based on state
  const getBorderColor = (): string => {
    if (hasError) return colors.error;
    if (focused) return colors.primary;
    if (disabled) return colors.disabled;
    return colors.outline;
  };

  const getBackgroundColor = (): string => {
    if (variant === 'filled') {
      return disabled ? colors.surfaceVariant : colors.surface;
    }
    return 'transparent';
  };

  // Container styles per variant
  const variantContainerStyles: Record<TextInputVariant, ViewStyle> = {
    outlined: {
      borderWidth: focused || hasError ? 2 : 1,
      borderColor: getBorderColor(),
      borderRadius: radii.md,
      backgroundColor: getBackgroundColor(),
    },
    filled: {
      borderWidth: 0,
      borderBottomWidth: focused || hasError ? 2 : 1,
      borderBottomColor: getBorderColor(),
      borderTopLeftRadius: radii.md,
      borderTopRightRadius: radii.md,
      backgroundColor: getBackgroundColor(),
    },
    underlined: {
      borderWidth: 0,
      borderBottomWidth: focused || hasError ? 2 : 1,
      borderBottomColor: getBorderColor(),
      backgroundColor: 'transparent',
    },
  };

  const inputContainerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    minHeight: 48,
    ...variantContainerStyles[variant],
  };

  const baseInputStyle: TextStyle = {
    ...typography.bodyMedium,
    color: disabled ? colors.onDisabled : colors.onBackground,
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
  };

  const labelColor = hasError ? colors.error : focused ? colors.primary : colors.onSurfaceVariant;

  const bottomText = error ?? helperText;
  const bottomTextColor = hasError ? colors.error : colors.onSurfaceVariant;

  return (
    <View style={StyleSheet.flatten([{ marginBottom: spacing.lg }, containerStyle])}>
      {label ? (
        <Text
          style={StyleSheet.flatten([
            typography.labelMedium,
            {
              color: labelColor,
              marginBottom: spacing.xs,
            },
          ])}
          accessibilityRole="text"
        >
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={handleContainerPress}
        style={inputContainerStyle}
        accessibilityRole="none"
      >
        {leftAdornment ? (
          <View
            style={{ marginRight: spacing.sm }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {leftAdornment}
          </View>
        ) : null}

        <RNTextInput
          ref={inputRef}
          style={StyleSheet.flatten([baseInputStyle, inputStyle])}
          placeholderTextColor={colors.onSurfaceVariant}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ disabled }}
          {...rest}
        />

        {rightAdornment ? (
          <View
            style={{ marginLeft: spacing.sm }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {rightAdornment}
          </View>
        ) : null}
      </Pressable>

      {bottomText ? (
        <Text
          style={StyleSheet.flatten([
            typography.caption,
            {
              color: bottomTextColor,
              marginTop: spacing.xs,
            },
          ])}
          accessibilityRole="text"
          accessibilityLiveRegion={hasError ? 'polite' : 'none'}
        >
          {bottomText}
        </Text>
      ) : null}
    </View>
  );
}

TextInput.displayName = 'TextInput';
