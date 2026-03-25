import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Google Font packages to avoid .ttf import issues in vitest
vi.mock('@expo-google-fonts/inter', () => ({
  Inter_400Regular: 1,
  Inter_500Medium: 2,
  Inter_600SemiBold: 3,
  Inter_700Bold: 4,
}));

vi.mock('@expo-google-fonts/jetbrains-mono', () => ({
  JetBrainsMono_400Regular: 5,
}));

vi.mock('@expo-google-fonts/dancing-script', () => ({
  DancingScript_400Regular: 6,
}));

vi.mock('@expo-google-fonts/great-vibes', () => ({
  GreatVibes_400Regular: 7,
}));

// Track calls to React hooks
let useStateValues: [boolean, (v: boolean) => void][] = [];
let effectCallbacks: (() => void)[] = [];
let callbackFns: ((...args: unknown[]) => unknown)[] = [];

// Mock React
vi.mock('react', () => ({
  useState: vi.fn((initial: boolean) => {
    const setter = vi.fn();
    const pair: [boolean, (v: boolean) => void] = [initial, setter];
    useStateValues.push(pair);
    return pair;
  }),
  useEffect: vi.fn((cb: () => void) => {
    effectCallbacks.push(cb);
  }),
  useCallback: vi.fn((cb: (...args: unknown[]) => unknown) => {
    callbackFns.push(cb);
    return cb;
  }),
}));

// Mock expo-font
const mockUseFonts = vi.fn<[], [boolean, Error | null]>();
vi.mock('expo-font', () => ({
  useFonts: (...args: unknown[]) => mockUseFonts(...(args as [])),
}));

// Mock expo-splash-screen
const mockPreventAutoHideAsync = vi.fn(() => Promise.resolve(true));
const mockHideAsync = vi.fn(() => Promise.resolve());
vi.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: (...args: unknown[]) => mockPreventAutoHideAsync(...(args as [])),
  hideAsync: (...args: unknown[]) => mockHideAsync(...(args as [])),
}));

// Import after mocks are set up
import { useFontsLoaded } from '../fonts/useFontsLoaded';
import { fontAssets } from '../fonts/config';

beforeEach(() => {
  vi.clearAllMocks();
  useStateValues = [];
  effectCallbacks = [];
  callbackFns = [];
});

describe('useFontsLoaded', () => {
  it('should call useFonts with the fontAssets map', () => {
    mockUseFonts.mockReturnValue([false, null]);
    useFontsLoaded();
    expect(mockUseFonts).toHaveBeenCalledWith(fontAssets);
  });

  it('should return fontsLoaded: false while loading', () => {
    mockUseFonts.mockReturnValue([false, null]);
    const result = useFontsLoaded();
    expect(result.fontsLoaded).toBe(false);
    expect(result.fontError).toBeNull();
  });

  it('should return fontsLoaded: true when fonts are loaded', () => {
    mockUseFonts.mockReturnValue([true, null]);
    const result = useFontsLoaded();
    expect(result.fontsLoaded).toBe(true);
    expect(result.fontError).toBeNull();
  });

  it('should return the font loading error when one occurs', () => {
    const error = new Error('Font loading failed');
    mockUseFonts.mockReturnValue([false, error]);
    const result = useFontsLoaded();
    expect(result.fontsLoaded).toBe(false);
    expect(result.fontError).toBe(error);
  });

  it('should provide an onLayoutRootView callback', () => {
    mockUseFonts.mockReturnValue([true, null]);
    const result = useFontsLoaded();
    expect(typeof result.onLayoutRootView).toBe('function');
  });

  describe('splash screen hiding via useEffect', () => {
    it('should register an effect for splash screen management', () => {
      mockUseFonts.mockReturnValue([true, null]);
      useFontsLoaded();
      expect(effectCallbacks.length).toBeGreaterThan(0);
    });

    it('should call hideAsync when fonts are loaded', async () => {
      mockUseFonts.mockReturnValue([true, null]);
      useFontsLoaded();

      // Run the registered effect
      const effect = effectCallbacks[0];
      expect(effect).toBeDefined();
      effect!();

      // Allow the promise to resolve
      await vi.waitFor(() => {
        expect(mockHideAsync).toHaveBeenCalled();
      });
    });

    it('should call hideAsync when there is a font error', async () => {
      mockUseFonts.mockReturnValue([false, new Error('fail')]);
      useFontsLoaded();

      const effect = effectCallbacks[0];
      expect(effect).toBeDefined();
      effect!();

      await vi.waitFor(() => {
        expect(mockHideAsync).toHaveBeenCalled();
      });
    });

    it('should not call hideAsync while still loading', () => {
      mockUseFonts.mockReturnValue([false, null]);
      useFontsLoaded();

      const effect = effectCallbacks[0];
      expect(effect).toBeDefined();
      effect!();

      expect(mockHideAsync).not.toHaveBeenCalled();
    });

    it('should handle hideAsync rejection gracefully', async () => {
      mockHideAsync.mockRejectedValueOnce(new Error('Already hidden'));
      mockUseFonts.mockReturnValue([true, null]);
      useFontsLoaded();

      const effect = effectCallbacks[0];
      expect(effect).toBeDefined();

      // Should not throw
      expect(() => effect!()).not.toThrow();

      // Allow the rejected promise to be caught
      await vi.waitFor(() => {
        expect(mockHideAsync).toHaveBeenCalled();
      });
    });
  });

  describe('onLayoutRootView callback', () => {
    it('should call hideAsync when fonts are loaded', async () => {
      mockUseFonts.mockReturnValue([true, null]);
      const result = useFontsLoaded();
      await result.onLayoutRootView();
      expect(mockHideAsync).toHaveBeenCalled();
    });

    it('should call hideAsync when there is a font error', async () => {
      mockUseFonts.mockReturnValue([false, new Error('fail')]);
      const result = useFontsLoaded();
      await result.onLayoutRootView();
      expect(mockHideAsync).toHaveBeenCalled();
    });

    it('should not call hideAsync while still loading', async () => {
      mockUseFonts.mockReturnValue([false, null]);
      const result = useFontsLoaded();
      await result.onLayoutRootView();
      expect(mockHideAsync).not.toHaveBeenCalled();
    });

    it('should handle hideAsync rejection gracefully', async () => {
      mockHideAsync.mockRejectedValueOnce(new Error('Already hidden'));
      mockUseFonts.mockReturnValue([true, null]);
      const result = useFontsLoaded();

      // Should not throw
      await expect(result.onLayoutRootView()).resolves.toBeUndefined();
    });
  });
});
