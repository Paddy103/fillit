/**
 * Zoomable document viewer with field overlays.
 *
 * Renders a document page image with pinch-to-zoom and pan gestures.
 * Detected fields are drawn as colored overlay rectangles that scale
 * with the image. Tapping a field selects it.
 */

import { useCallback, useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { DetectedField } from '@fillit/shared';

import { useTheme } from '../../theme';
import { FieldOverlay } from './FieldOverlay';

// ─── Props ──────────────────────────────────────────────────────────

export interface DocumentViewerProps {
  /** URI of the document page image. */
  imageUri: string;
  /** Original image dimensions for aspect ratio. */
  imageWidth: number;
  /** Original image dimensions for aspect ratio. */
  imageHeight: number;
  /** Detected fields to overlay on the image. */
  fields?: DetectedField[];
  /** Currently selected field ID. */
  selectedFieldId?: string;
  /** Called when a field overlay is tapped. */
  onFieldPress?: (field: DetectedField) => void;
  /** Minimum zoom scale. @default 1 */
  minZoom?: number;
  /** Maximum zoom scale. @default 5 */
  maxZoom?: number;
}

// ─── Component ──────────────────────────────────────────────────────

export function DocumentViewer({
  imageUri,
  imageWidth,
  imageHeight,
  fields = [],
  selectedFieldId,
  onFieldPress,
  minZoom = 1,
  maxZoom = 5,
}: DocumentViewerProps) {
  const { theme } = useTheme();
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Calculate display dimensions preserving aspect ratio
  const aspectRatio = imageWidth / imageHeight;
  let displayWidth = containerSize.width;
  let displayHeight = containerSize.width / aspectRatio;

  if (displayHeight > containerSize.height) {
    displayHeight = containerSize.height;
    displayWidth = containerSize.height * aspectRatio;
  }

  // Gesture shared values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const newScale = Math.min(Math.max(savedScale.value * e.scale, minZoom), maxZoom);
      scale.value = newScale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < minZoom) {
        scale.value = withTiming(minZoom);
        savedScale.value = minZoom;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > minZoom) {
        scale.value = withTiming(minZoom);
        savedScale.value = minZoom;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
      }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
  }, []);

  return (
    <GestureHandlerRootView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.container} onLayout={handleLayout} testID="document-viewer">
        <GestureDetector gesture={composedGesture}>
          <Animated.View
            style={[
              styles.imageContainer,
              {
                width: displayWidth,
                height: displayHeight,
              },
              animatedStyle,
            ]}
          >
            <Image
              source={{ uri: imageUri }}
              style={{ width: displayWidth, height: displayHeight }}
              resizeMode="contain"
              testID="document-viewer-image"
            />
            {fields.map((field) => (
              <FieldOverlay
                key={field.id}
                field={field}
                imageWidth={displayWidth}
                imageHeight={displayHeight}
                isSelected={field.id === selectedFieldId}
                onPress={onFieldPress}
              />
            ))}
          </Animated.View>
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

DocumentViewer.displayName = 'DocumentViewer';
