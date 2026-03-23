import { describe, it, expect } from 'vitest';
import { ThemeContext } from '../ThemeContext';
import { lightTheme } from '../themes';

describe('ThemeContext', () => {
  it('should be a valid React context object', () => {
    expect(ThemeContext).toBeDefined();
    expect(ThemeContext.Provider).toBeDefined();
    expect(ThemeContext.Consumer).toBeDefined();
  });

  it('should have a display name', () => {
    expect(ThemeContext.displayName).toBe('ThemeContext');
  });

  it('should have a default value with light theme', () => {
    // Access the default value via the internal _currentValue
    // We verify through the documented default behavior instead
    const defaultValue = ThemeContext['_currentValue'] as {
      theme: typeof lightTheme;
      colorMode: string;
      resolvedColorScheme: string;
      isDark: boolean;
    };

    // The default context should use light theme
    expect(defaultValue.theme).toBe(lightTheme);
    expect(defaultValue.colorMode).toBe('system');
    expect(defaultValue.resolvedColorScheme).toBe('light');
    expect(defaultValue.isDark).toBe(false);
  });

  it('should have no-op setColorMode in default value', () => {
    const defaultValue = ThemeContext['_currentValue'] as {
      setColorMode: (mode: string) => void;
    };
    expect(() => defaultValue.setColorMode('dark')).not.toThrow();
  });

  it('should have no-op toggleColorMode in default value', () => {
    const defaultValue = ThemeContext['_currentValue'] as {
      toggleColorMode: () => void;
    };
    expect(() => defaultValue.toggleColorMode()).not.toThrow();
  });
});
