/**
 * Freehand signature drawing canvas.
 *
 * Uses react-native-gesture-handler for touch tracking and
 * react-native-svg for smooth vector rendering. Captures strokes
 * as SVG path data strings for compact, resolution-independent storage.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '../../theme';
import { Button } from '../ui/Button';

// ─── Types ─────────────────────────────────────────────────────────

/** A single continuous stroke captured from a finger gesture. */
interface Stroke {
  /** SVG path data string (e.g. "M 10 20 L 30 40 ..."). */
  path: string;
  /** Stroke color. */
  color: string;
  /** Stroke width in pixels. */
  width: number;
}

/** Result returned when the user saves their drawn signature. */
export interface SignaturePadResult {
  /** Combined SVG path data for all strokes. */
  svgPath: string;
  /** Stroke color used. */
  color: string;
  /** Stroke width used. */
  strokeWidth: number;
}

export interface SignaturePadProps {
  /** Canvas height in dp. @default 200 */
  height?: number;
  /** Initial stroke color. @default theme.colors.onSurface */
  strokeColor?: string;
  /** Initial stroke width. @default 2.5 */
  strokeWidth?: number;
  /** Available stroke widths for the picker. */
  strokeWidths?: number[];
  /** Available stroke colors for the picker. */
  strokeColors?: string[];
  /** Called when the user taps Save with a non-empty signature. */
  onSave?: (result: SignaturePadResult) => void;
  /** Called when the user taps Cancel. */
  onCancel?: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────────

function buildPathData(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  let d = `M ${first!.x.toFixed(1)} ${first!.y.toFixed(1)}`;
  for (const p of rest) {
    d += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }
  return d;
}

// ─── Component ─────────────────────────────────────────────────────

const DEFAULT_WIDTHS = [1.5, 2.5, 4];
const DEFAULT_COLORS = ['#000000', '#1A237E', '#1B5E20'];

export function SignaturePad({
  height = 200,
  strokeColor,
  strokeWidth = 2.5,
  strokeWidths = DEFAULT_WIDTHS,
  strokeColors = DEFAULT_COLORS,
  onSave,
  onCancel,
}: SignaturePadProps) {
  const { theme } = useTheme();
  const defaultColor = strokeColor ?? theme.colors.onSurface;

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [activeColor, setActiveColor] = useState(defaultColor);
  const [activeWidth, setActiveWidth] = useState(strokeWidth);
  const currentPoints = useRef<Array<{ x: number; y: number }>>([]);

  const isEmpty = strokes.length === 0;

  const handleClear = useCallback(() => {
    setStrokes([]);
  }, []);

  const handleUndo = useCallback(() => {
    setStrokes((prev) => prev.slice(0, -1));
  }, []);

  const handleSave = useCallback(() => {
    if (isEmpty || !onSave) return;
    const svgPath = strokes.map((s) => s.path).join(' ');
    onSave({ svgPath, color: activeColor, strokeWidth: activeWidth });
  }, [isEmpty, strokes, activeColor, activeWidth, onSave]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((e) => {
          currentPoints.current = [{ x: e.x, y: e.y }];
        })
        .onUpdate((e) => {
          currentPoints.current.push({ x: e.x, y: e.y });
        })
        .onEnd(() => {
          const path = buildPathData(currentPoints.current);
          if (path) {
            setStrokes((prev) => [...prev, { path, color: activeColor, width: activeWidth }]);
          }
          currentPoints.current = [];
        }),
    [activeColor, activeWidth],
  );

  return (
    <View testID="signature-pad">
      {/* Canvas */}
      <GestureHandlerRootView>
        <GestureDetector gesture={panGesture}>
          <View
            style={[
              styles.canvas,
              {
                height,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
                borderRadius: theme.radii.md,
              },
            ]}
            testID="signature-pad-canvas"
          >
            <Svg width="100%" height="100%">
              {strokes.map((stroke, i) => (
                <Path
                  key={i}
                  d={stroke.path}
                  stroke={stroke.color}
                  strokeWidth={stroke.width}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </Svg>
          </View>
        </GestureDetector>
      </GestureHandlerRootView>

      {/* Toolbar: color + width pickers */}
      <View style={[styles.toolbar, { marginTop: theme.spacing.sm }]}>
        {/* Color picker */}
        <View style={styles.pickerRow}>
          {strokeColors.map((color) => (
            <View
              key={color}
              style={[
                styles.colorSwatch,
                {
                  backgroundColor: color,
                  borderColor: color === activeColor ? theme.colors.primary : 'transparent',
                  borderWidth: color === activeColor ? 2.5 : 0,
                },
              ]}
              onTouchEnd={() => setActiveColor(color)}
              accessibilityRole="button"
              accessibilityLabel={`Pen color ${color}`}
              accessibilityState={{ selected: color === activeColor }}
              testID={`signature-pad-color-${color}`}
            />
          ))}
        </View>

        {/* Width picker */}
        <View style={styles.pickerRow}>
          {strokeWidths.map((w) => (
            <View
              key={w}
              style={[
                styles.widthOption,
                {
                  borderColor: w === activeWidth ? theme.colors.primary : theme.colors.outline,
                  borderWidth: w === activeWidth ? 2 : 1,
                  borderRadius: theme.radii.sm,
                },
              ]}
              onTouchEnd={() => setActiveWidth(w)}
              accessibilityRole="button"
              accessibilityLabel={`Pen width ${w}`}
              accessibilityState={{ selected: w === activeWidth }}
              testID={`signature-pad-width-${w}`}
            >
              <View
                style={{
                  width: 24,
                  height: w,
                  backgroundColor: activeColor,
                  borderRadius: w / 2,
                }}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Actions */}
      <View style={[styles.actions, { marginTop: theme.spacing.md }]}>
        <Button
          label="Clear"
          variant="ghost"
          size="sm"
          onPress={handleClear}
          disabled={isEmpty}
          testID="signature-pad-clear"
          style={{ marginRight: theme.spacing.sm }}
        />
        <Button
          label="Undo"
          variant="outline"
          size="sm"
          onPress={handleUndo}
          disabled={isEmpty}
          testID="signature-pad-undo"
          style={{ marginRight: theme.spacing.sm }}
        />
        {onCancel ? (
          <Button
            label="Cancel"
            variant="outline"
            size="sm"
            onPress={onCancel}
            testID="signature-pad-cancel"
            style={{ marginRight: theme.spacing.sm }}
          />
        ) : null}
        <Button
          label="Save"
          variant="primary"
          size="sm"
          onPress={handleSave}
          disabled={isEmpty}
          testID="signature-pad-save"
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  canvas: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  widthOption: {
    width: 40,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

SignaturePad.displayName = 'SignaturePad';
