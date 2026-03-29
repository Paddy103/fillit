/**
 * Signature consent screen.
 *
 * Shows signature field locations in the document, lets the user
 * select a saved signature, agree to legal consent, and confirm
 * or decline signing. This is the final step before signatures
 * are applied to the document.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { DetectedField, StoredSignature } from '@fillit/shared';

import { useTheme } from '../../theme';
import { SignaturePreview } from './SignaturePreview';
import { Button } from '../ui/Button';

// ─── Types ─────────────────────────────────────────────────────────

export interface SignatureFieldInfo {
  /** The detected signature field. */
  field: DetectedField;
  /** The page number where this field appears. */
  pageNumber: number;
}

export interface SignatureConsentScreenProps {
  /** Signature fields detected in the document. */
  signatureFields: SignatureFieldInfo[];
  /** Saved signatures for the active profile. */
  availableSignatures: StoredSignature[];
  /** Called when the user confirms signing. Returns selected signature per field. */
  onConfirm: (assignments: Map<string, string>) => void;
  /** Called when the user declines signing. */
  onDecline: () => void;
  /** Whether the confirm action is in progress. */
  isSubmitting?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────

const CONSENT_TEXT =
  'I confirm that I am authorised to sign this document and that the signature(s) ' +
  'applied represent my legal intent to sign. I understand that electronic signatures ' +
  'carry the same legal weight as handwritten signatures under South African law ' +
  '(Electronic Communications and Transactions Act, 2002).';

// ─── Component ─────────────────────────────────────────────────────

export function SignatureConsentScreen({
  signatureFields,
  availableSignatures,
  onConfirm,
  onDecline,
  isSubmitting = false,
}: SignatureConsentScreenProps) {
  const { theme } = useTheme();

  // Track which signature is assigned to each field (fieldId → signatureId)
  const [assignments, setAssignments] = useState<Map<string, string>>(() => {
    const map = new Map<string, string>();
    const defaultSig = availableSignatures.find((s) => s.isDefault);
    if (defaultSig) {
      for (const sf of signatureFields) {
        map.set(sf.field.id, defaultSig.id);
      }
    }
    return map;
  });

  const [consentChecked, setConsentChecked] = useState(false);

  const allFieldsAssigned = useMemo(
    () => signatureFields.every((sf) => assignments.has(sf.field.id)),
    [signatureFields, assignments],
  );

  const canConfirm = allFieldsAssigned && consentChecked && !isSubmitting;

  const handleAssign = useCallback((fieldId: string, signatureId: string) => {
    setAssignments((prev) => {
      const next = new Map(prev);
      next.set(fieldId, signatureId);
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (!canConfirm) return;
    onConfirm(assignments);
  }, [canConfirm, assignments, onConfirm]);

  const handleDecline = useCallback(() => {
    Alert.alert('Decline Signing', 'Are you sure you want to skip signing this document?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: onDecline },
    ]);
  }, [onDecline]);

  const getSignatureById = useCallback(
    (id: string) => availableSignatures.find((s) => s.id === id),
    [availableSignatures],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      testID="signature-consent-screen"
    >
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing['3xl'] }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <Ionicons name="document-text-outline" size={32} color={theme.colors.primary} />
          <Text
            style={[
              theme.typography.titleLarge,
              { color: theme.colors.onSurface, marginTop: theme.spacing.sm },
            ]}
          >
            Review & Sign
          </Text>
          <Text
            style={[
              theme.typography.bodyMedium,
              {
                color: theme.colors.onSurfaceVariant,
                marginTop: theme.spacing.xs,
                textAlign: 'center',
              },
            ]}
          >
            {signatureFields.length === 1
              ? '1 signature field found in this document.'
              : `${signatureFields.length} signature fields found in this document.`}
          </Text>
        </View>

        {/* Signature field assignments */}
        <Text
          style={[
            theme.typography.labelLarge,
            { color: theme.colors.onSurface, marginTop: theme.spacing.xl },
          ]}
        >
          Signature assignments
        </Text>

        {signatureFields.map((sf) => {
          const assignedSigId = assignments.get(sf.field.id);
          const assignedSig = assignedSigId ? getSignatureById(assignedSigId) : undefined;

          return (
            <View
              key={sf.field.id}
              style={[
                styles.fieldCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: assignedSig ? theme.colors.primary : theme.colors.outline,
                  borderRadius: theme.radii.md,
                  padding: theme.spacing.md,
                  marginTop: theme.spacing.sm,
                },
              ]}
              testID={`consent-field-${sf.field.id}`}
            >
              <View style={styles.fieldHeader}>
                <Ionicons
                  name={assignedSig ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={assignedSig ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    theme.typography.labelLarge,
                    { color: theme.colors.onSurface, marginLeft: theme.spacing.sm, flex: 1 },
                  ]}
                  numberOfLines={1}
                >
                  {sf.field.label || 'Signature'}
                </Text>
                <Text
                  style={[theme.typography.bodySmall, { color: theme.colors.onSurfaceVariant }]}
                >
                  Page {sf.pageNumber}
                </Text>
              </View>

              {/* Assigned signature preview */}
              {assignedSig ? (
                <View style={{ marginTop: theme.spacing.sm }}>
                  <SignaturePreview signature={assignedSig} size="thumbnail" expandable={false} />
                </View>
              ) : null}

              {/* Signature selector */}
              <FlatList
                data={availableSignatures}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ marginTop: theme.spacing.sm }}
                renderItem={({ item }) => {
                  const isSelected = assignedSigId === item.id;
                  return (
                    <Pressable
                      style={[
                        styles.sigOption,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primaryLight
                            : theme.colors.surfaceVariant,
                          borderColor: isSelected ? theme.colors.primary : 'transparent',
                          borderRadius: theme.radii.sm,
                          paddingHorizontal: theme.spacing.md,
                          paddingVertical: theme.spacing.sm,
                          marginRight: theme.spacing.sm,
                        },
                      ]}
                      onPress={() => handleAssign(sf.field.id, item.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`Use ${item.label} signature`}
                      testID={`assign-${sf.field.id}-${item.id}`}
                    >
                      <Text
                        style={[
                          theme.typography.labelMedium,
                          {
                            color: isSelected
                              ? theme.colors.onPrimary
                              : theme.colors.onSurfaceVariant,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                      {item.isDefault ? (
                        <Ionicons
                          name="star"
                          size={12}
                          color={
                            isSelected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant
                          }
                          style={{ marginLeft: 4 }}
                        />
                      ) : null}
                    </Pressable>
                  );
                }}
              />
            </View>
          );
        })}

        {/* No signatures warning */}
        {availableSignatures.length === 0 ? (
          <View
            style={[
              styles.warningBox,
              {
                backgroundColor: theme.colors.warningLight,
                borderRadius: theme.radii.md,
                padding: theme.spacing.md,
                marginTop: theme.spacing.md,
              },
            ]}
          >
            <Ionicons name="warning-outline" size={20} color={theme.colors.warning} />
            <Text
              style={[
                theme.typography.bodyMedium,
                { color: theme.colors.onSurface, marginLeft: theme.spacing.sm, flex: 1 },
              ]}
            >
              No saved signatures. Add a signature in your profile before signing.
            </Text>
          </View>
        ) : null}

        {/* Legal consent */}
        <View
          style={[
            styles.consentBox,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
              borderRadius: theme.radii.md,
              padding: theme.spacing.md,
              marginTop: theme.spacing.xl,
            },
          ]}
          testID="consent-section"
        >
          <Text
            style={[
              theme.typography.labelLarge,
              { color: theme.colors.onSurface, marginBottom: theme.spacing.sm },
            ]}
          >
            Legal Consent
          </Text>
          <Text
            style={[
              theme.typography.bodySmall,
              { color: theme.colors.onSurfaceVariant, lineHeight: 18 },
            ]}
          >
            {CONSENT_TEXT}
          </Text>
          <View style={[styles.consentRow, { marginTop: theme.spacing.md }]}>
            <Switch
              value={consentChecked}
              onValueChange={setConsentChecked}
              trackColor={{ false: theme.colors.outline, true: theme.colors.primaryLight }}
              thumbColor={consentChecked ? theme.colors.primary : theme.colors.surface}
              accessibilityLabel="I agree to the legal consent"
              testID="consent-switch"
            />
            <Text
              style={[
                theme.typography.labelMedium,
                { color: theme.colors.onSurface, marginLeft: theme.spacing.sm, flex: 1 },
              ]}
            >
              I agree to the above terms
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.actions, { marginTop: theme.spacing.xl }]}>
          <Button
            label="Decline"
            variant="outline"
            size="lg"
            onPress={handleDecline}
            disabled={isSubmitting}
            testID="consent-decline-button"
            style={{ flex: 1, marginRight: theme.spacing.sm }}
          />
          <Button
            label={isSubmitting ? 'Signing...' : 'Confirm & Sign'}
            variant="primary"
            size="lg"
            onPress={handleConfirm}
            disabled={!canConfirm}
            testID="consent-confirm-button"
            style={{ flex: 1 }}
          />
        </View>

        {/* Status hint */}
        {!allFieldsAssigned && availableSignatures.length > 0 ? (
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
            Assign a signature to all fields to continue.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    alignItems: 'center',
  },
  fieldCard: {
    borderWidth: 1,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sigOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  consentBox: {
    borderWidth: 1,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
  },
});

SignatureConsentScreen.displayName = 'SignatureConsentScreen';
