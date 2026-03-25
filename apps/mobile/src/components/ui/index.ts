/**
 * Foundational UI component library for the FillIt design system.
 *
 * All components consume theme tokens and support dark/light mode
 * via the ThemeProvider.
 */

// Typography
export {
  DisplayLarge,
  DisplayMedium,
  HeadingLarge,
  HeadingMedium,
  TitleLarge,
  TitleMedium,
  BodyLarge,
  BodyMedium,
  BodySmall,
  LabelLarge,
  LabelMedium,
  LabelSmall,
  Caption,
} from './Typography';
export type {
  TypographyVariant,
  TypographyColor,
  TypographyAlign,
  TypographyProps,
} from './Typography';

// Button
export { Button } from './Button';
export type { ButtonVariant, ButtonSize, ButtonProps } from './Button';

// TextInput
export { TextInput } from './TextInput';
export type { TextInputVariant, TextInputProps } from './TextInput';

// Card
export { Card, PressableCard } from './Card';
export type { CardElevation, CardProps, PressableCardProps } from './Card';

// Icon
export { Icon } from './Icon';
export type { IconSize, IconColor, IconProps } from './Icon';

// Divider
export { Divider } from './Divider';
export type { DividerOrientation, DividerProps } from './Divider';

// Badge & Chip
export { Badge, Chip } from './Badge';
export type { BadgeVariant, BadgeProps, ChipVariant, ChipColor, ChipProps } from './Badge';

// Avatar
export { Avatar } from './Avatar';
export type { AvatarSize, AvatarProps } from './Avatar';
