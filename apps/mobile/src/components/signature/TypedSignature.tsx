/**
 * Typed signature component.
 *
 * Lets the user type their name and choose from signature-style fonts.
 * Shows a live preview of the typed text in the selected font.
 */

import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme';
import { FontCategories, FontFamily } from '../../fonts/config';
import { Button } from '../ui/Button';
import { TextInput } from '../ui/TextInput';
import { Chip } from '../ui/Badge';

// ─── Types ─────────────────────────────────────────────────────────

/** A signature font option shown in the picker. */
export interface SignatureFont {
  /** Font family name (matches a loaded font). */
  family: string;
  /** Display label for the picker. */
  label: string;
}

/** Result returned when the user saves a typed signature. */
export interface TypedSignatureResult {
  /** The typed text (e.g. the user's name). */
  text: string;
  /** The selected font family name. */
  fontFamily: string;
}

export interface TypedSignatureProps {
  /** Initial text value. */
  initialText?: string;
  /** Initial font family. */
  initialFont?: string;
  /** Override the available signature fonts. */
  fonts?: SignatureFont[];
  /** Preview area height in dp. @default 100 */
  previewHeight?: number;
  /** Called when the user saves the typed signature. */
  onSave?: (result: TypedSignatureResult) => void;
  /** Called when the user cancels. */
  onCancel?: () => void;
}

// ─── Default Fonts ─────────────────────────────────────────────────

const DEFAULT_FONTS: SignatureFont[] = [
  { family: FontCategories.signature.dancingScript, label: 'Script' },
  { family: FontCategories.signature.greatVibes, label: 'Elegant' },
  { family: FontFamily.InterRegular, label: 'Print' },
];

// ─── Component ─────────────────────────────────────────────────────

export function TypedSignature({
  initialText = '',
  initialFont,
  fonts = DEFAULT_FONTS,
  previewHeight = 100,
  onSave,
  onCancel,
}: TypedSignatureProps) {
  const { theme } = useTheme();
  const [text, setText] = useState(initialText);
  const [selectedFont, setSelectedFont] = useState(
    initialFont ?? fonts[0]?.family ?? FontFamily.InterRegular,
  );

  const isEmpty = text.trim().length === 0;

  const handleSave = useCallback(() => {
    if (isEmpty || !onSave) return;
    onSave({ text: text.trim(), fontFamily: selectedFont });
  }, [isEmpty, text, selectedFont, onSave]);

  return (
    <View testID="typed-signature">
      {/* Text input */}
      <TextInput
        label="Your name"
        value={text}
        onChangeText={setText}
        placeholder="Type your name"
        variant="outlined"
        autoCapitalize="words"
        maxLength={100}
        testID="typed-signature-input"
      />

      {/* Font selector */}
      <View style={styles.fontRow}>
        <Text
          style={[
            theme.typography.labelMedium,
            {
              color: theme.colors.onSurfaceVariant,
              marginBottom: theme.spacing.sm,
            },
          ]}
        >
          Font style
        </Text>
        <View style={styles.fontChips}>
          {fonts.map((font) => (
            <Chip
              key={font.family}
              label={font.label}
              variant={selectedFont === font.family ? 'filled' : 'outlined'}
              color={selectedFont === font.family ? 'primary' : 'default'}
              selected={selectedFont === font.family}
              onPress={() => setSelectedFont(font.family)}
              style={{ marginRight: theme.spacing.sm }}
            />
          ))}
        </View>
      </View>

      {/* Live preview */}
      <View
        style={[
          styles.preview,
          {
            height: previewHeight,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
            borderRadius: theme.radii.md,
          },
        ]}
        testID="typed-signature-preview"
      >
        {text.trim() ? (
          <Text
            style={[
              styles.previewText,
              {
                fontFamily: selectedFont,
                color: theme.colors.onSurface,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {text}
          </Text>
        ) : (
          <Text
            style={[
              theme.typography.bodyMedium,
              { color: theme.colors.onSurfaceVariant, fontStyle: 'italic' },
            ]}
          >
            Signature preview
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={[styles.actions, { marginTop: theme.spacing.md }]}>
        {onCancel ? (
          <Button
            label="Cancel"
            variant="outline"
            size="sm"
            onPress={onCancel}
            testID="typed-signature-cancel"
            style={{ marginRight: theme.spacing.sm }}
          />
        ) : null}
        <Button
          label="Save"
          variant="primary"
          size="sm"
          onPress={handleSave}
          disabled={isEmpty}
          testID="typed-signature-save"
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fontRow: {
    marginBottom: 12,
  },
  fontChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  preview: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  previewText: {
    fontSize: 36,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

TypedSignature.displayName = 'TypedSignature';
