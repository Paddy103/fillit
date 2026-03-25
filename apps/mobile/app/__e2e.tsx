/**
 * E2E Test Harness Screen
 *
 * Permanent screen used by Maestro E2E tests to exercise service-layer
 * functionality that has no UI. Not visible in navigation — accessed
 * directly via deep link or router.push('/__e2e').
 *
 * Each test suite is triggered by a button and displays pass/fail results
 * with testID attributes that Maestro can assert against.
 */

import { useState, useCallback } from 'react';
import { ScrollView, Text, Pressable, StyleSheet, View } from 'react-native';

import { runDatabaseTests } from '../src/e2e/database-suite';
import { runFileStorageTests } from '../src/e2e/file-storage-suite';
import { runSettingsTests } from '../src/e2e/settings-suite';

type TestResult = { name: string; status: 'pass' | 'fail'; detail: string };
type SuiteStatus = 'idle' | 'running' | 'done';

interface SuiteState {
  status: SuiteStatus;
  results: TestResult[];
}

export default function E2ETestScreen() {
  const [db, setDb] = useState<SuiteState>({ status: 'idle', results: [] });
  const [files, setFiles] = useState<SuiteState>({ status: 'idle', results: [] });
  const [settings, setSettings] = useState<SuiteState>({ status: 'idle', results: [] });

  const runSuite = useCallback(
    async (
      runner: () => Promise<TestResult[]>,
      setter: React.Dispatch<React.SetStateAction<SuiteState>>,
    ) => {
      setter({ status: 'running', results: [] });
      const results = await runner();
      setter({ status: 'done', results });
    },
    [],
  );

  const allResults = [...db.results, ...files.results, ...settings.results];
  const passCount = allResults.filter((r) => r.status === 'pass').length;
  const failCount = allResults.filter((r) => r.status === 'fail').length;
  const anyRunning =
    db.status === 'running' || files.status === 'running' || settings.status === 'running';

  const runAll = useCallback(async () => {
    setDb({ status: 'running', results: [] });
    const dbResults = await runDatabaseTests();
    setDb({ status: 'done', results: dbResults });

    setFiles({ status: 'running', results: [] });
    const fileResults = await runFileStorageTests();
    setFiles({ status: 'done', results: fileResults });

    setSettings({ status: 'running', results: [] });
    const settingsResults = await runSettingsTests();
    setSettings({ status: 'done', results: settingsResults });
  }, []);

  return (
    <ScrollView style={styles.container} testID="e2e-screen">
      <Text style={styles.title} testID="e2e-title">
        E2E Test Harness
      </Text>

      {allResults.length > 0 && (
        <Text style={styles.summary} testID="e2e-summary">
          {passCount} passed, {failCount} failed
        </Text>
      )}

      <Pressable
        style={[styles.button, styles.buttonPrimary, anyRunning && styles.buttonDisabled]}
        onPress={runAll}
        disabled={anyRunning}
        testID="e2e-run-all"
      >
        <Text style={styles.buttonText}>{anyRunning ? 'Running...' : 'Run All Suites'}</Text>
      </Pressable>

      <View style={styles.suiteRow}>
        <SuiteButton
          label="Database"
          testID="e2e-run-database"
          running={db.status === 'running'}
          disabled={anyRunning}
          onPress={() => runSuite(runDatabaseTests, setDb)}
        />
        <SuiteButton
          label="Files"
          testID="e2e-run-files"
          running={files.status === 'running'}
          disabled={anyRunning}
          onPress={() => runSuite(runFileStorageTests, setFiles)}
        />
        <SuiteButton
          label="Settings"
          testID="e2e-run-settings"
          running={settings.status === 'running'}
          disabled={anyRunning}
          onPress={() => runSuite(runSettingsTests, setSettings)}
        />
      </View>

      {db.results.length > 0 && (
        <SuiteResults title="Database (S-15)" results={db.results} testID="suite-database" />
      )}
      {files.results.length > 0 && (
        <SuiteResults title="File Storage (S-21)" results={files.results} testID="suite-files" />
      )}
      {settings.results.length > 0 && (
        <SuiteResults title="Settings (S-23)" results={settings.results} testID="suite-settings" />
      )}
    </ScrollView>
  );
}

function SuiteButton({
  label,
  testID,
  running,
  disabled,
  onPress,
}: {
  label: string;
  testID: string;
  running: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.button, styles.buttonSmall, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      testID={testID}
    >
      <Text style={styles.buttonText}>{running ? '...' : label}</Text>
    </Pressable>
  );
}

function SuiteResults({
  title,
  results,
  testID,
}: {
  title: string;
  results: TestResult[];
  testID: string;
}) {
  const pass = results.filter((r) => r.status === 'pass').length;
  const fail = results.filter((r) => r.status === 'fail').length;
  return (
    <View testID={testID}>
      <Text style={styles.suiteTitle}>
        {title} — {pass}/{results.length} passed{fail > 0 ? ` (${fail} failed)` : ''}
      </Text>
      {results.map((r, i) => (
        <View
          key={i}
          style={[styles.result, r.status === 'fail' && styles.resultFail]}
          testID={`${testID}-${i}-${r.status}`}
        >
          <Text style={styles.resultStatus}>{r.status === 'pass' ? '\u2705' : '\u274C'}</Text>
          <View style={styles.resultText}>
            <Text style={styles.resultName}>{r.name}</Text>
            {r.detail ? <Text style={styles.resultDetail}>{r.detail}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  summary: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonPrimary: { backgroundColor: '#2563eb' },
  buttonSmall: { flex: 1, marginHorizontal: 4, backgroundColor: '#475569' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  suiteRow: { flexDirection: 'row', marginBottom: 16 },
  suiteTitle: { fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  result: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultFail: { backgroundColor: '#fef2f2' },
  resultStatus: { fontSize: 16, marginRight: 8, width: 24 },
  resultText: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: '500' },
  resultDetail: { fontSize: 12, color: '#666', marginTop: 1 },
});
