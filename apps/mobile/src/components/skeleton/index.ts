// Skeleton component public API

// Base component
export { Skeleton } from './Skeleton';

// Shape variants
export { SkeletonText } from './SkeletonText';
export { SkeletonAvatar } from './SkeletonAvatar';
export { SkeletonCard } from './SkeletonCard';

// Layout compositions
export { SkeletonProfileCard } from './SkeletonProfileCard';
export { SkeletonListItem } from './SkeletonListItem';
export { SkeletonDocumentCard } from './SkeletonDocumentCard';

// Hooks
export { useSkeletonColors, type SkeletonColors } from './useSkeletonColors';

// Types
export type {
  SkeletonShape,
  ShimmerConfig,
  SkeletonBaseProps,
  SkeletonProps,
  SkeletonTextProps,
  SkeletonAvatarProps,
  SkeletonCardProps,
  SkeletonProfileCardProps,
  SkeletonListItemProps,
  SkeletonDocumentCardProps,
} from './types';
