/**
 * Custom hook for loading all app fonts with splash screen integration.
 *
 * Keeps the splash screen visible while fonts load, then hides it
 * once all fonts are ready (or if loading fails).
 */

import { useCallback, useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { fontAssets } from './config';

/** Result returned by the useFontsLoaded hook */
export interface FontsLoadedResult {
  /** Whether all fonts have finished loading successfully */
  fontsLoaded: boolean;
  /** Error encountered during font loading, if any */
  fontError: Error | null;
  /** Callback to hide the splash screen — call when app is ready to render */
  onLayoutRootView: () => Promise<void>;
}

/**
 * Load all custom fonts and manage splash screen visibility.
 *
 * Usage:
 * ```tsx
 * const { fontsLoaded, fontError, onLayoutRootView } = useFontsLoaded();
 *
 * if (!fontsLoaded && !fontError) {
 *   return null; // Still loading
 * }
 *
 * return (
 *   <View onLayout={onLayoutRootView}>
 *     <App />
 *   </View>
 * );
 * ```
 */
export function useFontsLoaded(): FontsLoadedResult {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [splashHidden, setSplashHidden] = useState(false);

  useEffect(() => {
    if ((fontsLoaded || fontError) && !splashHidden) {
      SplashScreen.hideAsync()
        .then(() => {
          setSplashHidden(true);
        })
        .catch(() => {
          // Splash screen may already be hidden; safe to ignore
          setSplashHidden(true);
        });
    }
  }, [fontsLoaded, fontError, splashHidden]);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync().catch(() => {
        // Splash screen may already be hidden; safe to ignore
      });
    }
  }, [fontsLoaded, fontError]);

  return { fontsLoaded, fontError, onLayoutRootView };
}
