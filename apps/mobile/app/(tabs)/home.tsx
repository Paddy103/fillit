/**
 * Home / Dashboard tab screen.
 *
 * Displays a welcome greeting, quick-action buttons (Scan, Import),
 * quick stats, recent documents, and a floating scan FAB.
 * This is the primary landing screen after app launch.
 */

import React, { useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { useTheme } from '../../src/theme';
import { Button, DisplayMedium, BodyLarge } from '../../src/components/ui';
import { ScanFAB, QuickStats, RecentDocuments } from '../../src/components/home';
import { useScanDocument } from '../../src/hooks/useScanDocument';
import {
  useDocumentStore,
  selectDocuments,
  selectIsLoading as selectDocIsLoading,
  selectIsInitialized as selectDocIsInitialized,
  selectDocumentsByStatus,
} from '../../src/stores/document-store';
import {
  useProfileStore,
  selectProfileCount,
  selectIsInitialized as selectProfileIsInitialized,
} from '../../src/stores/profile-store';

export default function HomeScreen() {
  useStoreInitialization();
  const router = useRouter();
  const { scan, isScanning } = useScanDocument({
    onSuccess: (id) => {
      router.push(`/scan/${id}` as never);
    },
  });

  return (
    <View style={styles.root} testID="home-screen">
      <DashboardContent scan={scan} isScanning={isScanning} />
      <ScanFAB onPress={scan} disabled={isScanning} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Initialize document and profile stores on mount */
function useStoreInitialization() {
  const initDocs = useDocumentStore((s) => s.initialize);
  const initProfiles = useProfileStore((s) => s.initialize);

  useEffect(() => {
    void initDocs();
    void initProfiles();
  }, [initDocs, initProfiles]);
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

/** Scrollable dashboard body with hero, actions, stats, and documents */
function DashboardContent({ scan, isScanning }: { scan: () => void; isScanning: boolean }) {
  const { theme } = useTheme();
  const documents = useDocumentStore(selectDocuments);
  const isLoading = useDocumentStore(selectDocIsLoading);
  const docInitialized = useDocumentStore(selectDocIsInitialized);
  const profileInitialized = useProfileStore(selectProfileIsInitialized);
  const profileCount = useProfileStore(selectProfileCount);
  const exportedCount = useDocumentStore(selectDocumentsByStatus('exported')).length;

  const sortedDocs = [...documents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const storesReady = docInitialized && profileInitialized;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.content, { padding: theme.spacing.lg }]}
    >
      <HeroSection />
      <QuickActions scan={scan} isScanning={isScanning} />

      {storesReady ? (
        <>
          <QuickStats
            documentCount={documents.length}
            profileCount={profileCount}
            exportedCount={exportedCount}
          />
          <RecentDocuments documents={sortedDocs} isLoading={isLoading} />
        </>
      ) : (
        <>
          <QuickStats documentCount={0} profileCount={0} exportedCount={0} />
          <RecentDocuments documents={[]} isLoading />
        </>
      )}

      {/* Bottom spacer for FAB clearance */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

DashboardContent.displayName = 'DashboardContent';

/** Welcome hero banner */
function HeroSection() {
  const { theme } = useTheme();

  return (
    <View style={[styles.hero, { marginBottom: theme.spacing['2xl'] }]}>
      <DisplayMedium>FillIt</DisplayMedium>
      <BodyLarge color="secondary" align="center">
        Scan, fill, and export documents with ease.
      </BodyLarge>
    </View>
  );
}

HeroSection.displayName = 'HeroSection';

/** Scan and Import action buttons */
function QuickActions({ scan, isScanning }: { scan: () => void; isScanning: boolean }) {
  const { theme } = useTheme();

  const handleImport = () => {
    Alert.alert('Coming Soon', 'Document import will be available in a future update.');
  };

  return (
    <View style={[styles.quickActions, { gap: theme.spacing.md, marginBottom: theme.spacing.xl }]}>
      <Button
        label={isScanning ? 'Scanning...' : 'Scan'}
        variant="primary"
        size="lg"
        fullWidth
        onPress={scan}
        loading={isScanning}
        iconLeft={
          isScanning ? undefined : <Ionicons name="scan" size={22} color={theme.colors.onPrimary} />
        }
        accessibilityLabel="Scan a document"
        testID="action-scan"
        style={{ flex: 1 }}
      />
      <Button
        label="Import"
        variant="outline"
        size="lg"
        fullWidth
        onPress={handleImport}
        iconLeft={
          <Ionicons name="document-attach-outline" size={22} color={theme.colors.primary} />
        }
        accessibilityLabel="Import a document"
        testID="action-import"
        style={{ flex: 1 }}
      />
    </View>
  );
}

QuickActions.displayName = 'QuickActions';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
  },
});
