/**
 * Add signature screen.
 *
 * Lets the user create a new drawn or typed signature. The user can
 * toggle between modes, enter a label, and save to the active profile.
 */

import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';

import { useTheme } from '../../../src/theme';
import { ScreenHeader } from '../../../src/components/profile/ScreenHeader';
import {
  SignaturePad,
  TypedSignature,
  type SignaturePadResult,
  type TypedSignatureResult,
} from '../../../src/components/signature';
import { TextInput } from '../../../src/components/ui/TextInput';
import { Chip } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import {
  useProfileStore,
  selectActiveProfile,
  selectActiveProfileSignatures,
} from '../../../src/stores/profile-store';

type SignatureMode = 'drawn' | 'typed';

export default function AddSignatureScreen() {
  const { theme } = useTheme();
  const profile = useProfileStore(selectActiveProfile);
  const signatures = useProfileStore(selectActiveProfileSignatures);
  const createSignature = useProfileStore((s) => s.createSignature);

  const [mode, setMode] = useState<SignatureMode>('drawn');
  const [label, setLabel] = useState('');
  const [drawnResult, setDrawnResult] = useState<SignaturePadResult | null>(null);
  const [typedResult, setTypedResult] = useState<TypedSignatureResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isFirstSignature = signatures.length === 0;
  const hasSignature = mode === 'drawn' ? drawnResult !== null : typedResult !== null;
  const hasLabel = label.trim().length > 0;
  const canSave = hasSignature && hasLabel && !isSaving;

  const handleDrawnSave = useCallback((result: SignaturePadResult) => {
    setDrawnResult(result);
  }, []);

  const handleTypedSave = useCallback((result: TypedSignatureResult) => {
    setTypedResult(result);
  }, []);

  const handleSave = useCallback(async () => {
    if (!profile || !canSave) return;

    setIsSaving(true);
    try {
      const id = Crypto.randomUUID();
      if (mode === 'drawn' && drawnResult) {
        await createSignature({
          id,
          profileId: profile.id,
          type: 'drawn',
          label: label.trim(),
          svgPath: drawnResult.svgPath,
          isDefault: isFirstSignature,
        });
      } else if (mode === 'typed' && typedResult) {
        await createSignature({
          id,
          profileId: profile.id,
          type: 'typed',
          label: label.trim(),
          text: typedResult.text,
          fontFamily: typedResult.fontFamily,
          isDefault: isFirstSignature,
        });
      }
      router.back();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save signature.');
    } finally {
      setIsSaving(false);
    }
  }, [profile, canSave, mode, drawnResult, typedResult, label, isFirstSignature, createSignature]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      testID="add-signature-screen"
    >
      <ScreenHeader title="Add Signature" onBack={() => router.back()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: theme.spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Label input */}
          <TextInput
            label="Signature label"
            value={label}
            onChangeText={setLabel}
            placeholder='e.g. "Full name", "Initials"'
            variant="outlined"
            maxLength={50}
            testID="signature-label-input"
          />

          {/* Mode tabs */}
          <View style={[styles.modeRow, { marginTop: theme.spacing.lg }]}>
            <Text
              style={[
                theme.typography.labelMedium,
                {
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: theme.spacing.sm,
                },
              ]}
            >
              Signature type
            </Text>
            <View style={styles.modeChips}>
              <Chip
                label="Draw"
                variant={mode === 'drawn' ? 'filled' : 'outlined'}
                color={mode === 'drawn' ? 'primary' : 'default'}
                selected={mode === 'drawn'}
                onPress={() => setMode('drawn')}
                style={{ marginRight: theme.spacing.sm }}
              />
              <Chip
                label="Type"
                variant={mode === 'typed' ? 'filled' : 'outlined'}
                color={mode === 'typed' ? 'primary' : 'default'}
                selected={mode === 'typed'}
                onPress={() => setMode('typed')}
              />
            </View>
          </View>

          {/* Signature input */}
          <View style={{ marginTop: theme.spacing.lg }}>
            {mode === 'drawn' ? (
              <View>
                <SignaturePad onSave={handleDrawnSave} height={200} />
                {drawnResult ? (
                  <Text
                    style={[
                      theme.typography.bodySmall,
                      {
                        color: theme.colors.primary,
                        marginTop: theme.spacing.sm,
                        textAlign: 'center',
                      },
                    ]}
                  >
                    Signature captured
                  </Text>
                ) : null}
              </View>
            ) : (
              <TypedSignature onSave={handleTypedSave} />
            )}
          </View>

          {/* Save button */}
          <Button
            label={isSaving ? 'Saving...' : 'Save Signature'}
            variant="primary"
            size="lg"
            onPress={handleSave}
            disabled={!canSave}
            testID="save-signature-button"
            style={{ marginTop: theme.spacing.xl }}
          />

          {isFirstSignature ? (
            <Text
              style={[
                theme.typography.bodySmall,
                {
                  color: theme.colors.onSurfaceVariant,
                  textAlign: 'center',
                  marginTop: theme.spacing.sm,
                },
              ]}
            >
              This will be set as your default signature.
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  modeRow: {},
  modeChips: {
    flexDirection: 'row',
  },
});
