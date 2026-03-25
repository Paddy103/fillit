# E2E Testing with Maestro

End-to-end tests for the FillIt mobile app using [Maestro](https://maestro.mobile.dev/).

## Prerequisites

1. **Maestro CLI** — Install via:
   ```bash
   # macOS / Linux / WSL
   curl -fsSL "https://get.maestro.mobile.dev" | bash

   # Windows — download from GitHub releases
   ```
2. **Java 17+** with `JAVA_HOME` set
3. **Dev build** of the app on a connected device or emulator (`expo-dev-client`)

## Directory Structure

```
.maestro/
├── config.yaml              # Workspace config (flow discovery, tags, order)
├── navigate-to-e2e.yaml     # Shared sub-flow to reach E2E test harness
├── README.md                # This file
├── flows/
│   ├── smoke/               # Fast checks for PR gating
│   │   └── app-launches.yaml
│   ├── services/            # Service-layer tests (DB, files, settings)
│   │   ├── all-services.yaml
│   │   ├── database-s15.yaml
│   │   ├── file-storage-s21.yaml
│   │   └── settings-s23.yaml
│   └── ui/                  # UI/visual tests
│       ├── theme-switching-s26.yaml
│       └── fonts-s27.yaml
└── scripts/                 # JavaScript helpers for runScript
```

## Running Tests

```bash
# Run all E2E tests
cd apps/mobile
maestro test .maestro/

# Run only smoke tests (fast PR check)
maestro test --include-tags=smoke .maestro/

# Run only service tests
maestro test --include-tags=services .maestro/

# Run a single flow
maestro test .maestro/flows/services/database-s15.yaml

# Generate JUnit report (for CI)
maestro test --format junit --output e2e-report.xml .maestro/
```

## Building for E2E

```bash
# Android
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleDebug && cd ..
adb install android/app/build/outputs/apk/debug/app-debug.apk
maestro test .maestro/

# iOS (macOS only)
npx expo prebuild --platform ios --clean
npx expo run:ios --device
maestro test .maestro/
```

## How Service Tests Work

Service-layer tests (database, file storage, settings) have no UI to interact with directly. They use an **E2E test harness screen** at the route `/__e2e` which:

1. Exposes buttons to trigger each test suite
2. Runs the actual service functions on-device
3. Displays pass/fail results with `testID` attributes
4. Maestro navigates there via deep link, taps the run button, and asserts no failures

The harness screen lives at `app/__e2e.tsx` and the suite runners live in `src/e2e/`.

## Writing New E2E Flows

Every new story with UI or native functionality must include a Maestro flow:

1. Create a YAML file in the appropriate subdirectory (`flows/smoke/`, `flows/services/`, `flows/ui/`)
2. Name it `{feature-name}-{story-id}.yaml`
3. Tag it with `regression` and the appropriate category
4. For service tests, add a suite runner in `src/e2e/` and register it in the harness screen

### Template

```yaml
# S-XX: Brief description
appId: com.fillit.app
tags:
  - regression
  - services  # or: smoke, ui
---
- launchApp:
    clearState: true
# ... your test steps
```

## CI

E2E tests run automatically on PRs via `.github/workflows/e2e-android.yml`:
- Builds a debug APK
- Boots an Android emulator (API 34)
- Installs the APK and runs all Maestro flows
- Uploads JUnit results as artifacts
- Fails the PR check if any flow fails
