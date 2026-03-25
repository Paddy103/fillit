/** Result from a single E2E test step. */
export type TestResult = { name: string; status: 'pass' | 'fail'; detail: string };

/** Helper to create a pass result. */
export function pass(name: string, detail = ''): TestResult {
  return { name, status: 'pass', detail };
}

/** Helper to create a fail result. */
export function fail(name: string, detail: string): TestResult {
  return { name, status: 'fail', detail };
}
