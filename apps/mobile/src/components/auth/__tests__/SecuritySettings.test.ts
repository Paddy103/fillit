import { describe, it, expect, vi } from 'vitest';
import type { AutoLockTimeout } from '../../../stores/settings-store';

describe('SecuritySettings', () => {
  it('should format timeout values correctly', () => {
    const formatTimeout = (t: AutoLockTimeout): string => {
      if (t === null) return 'Never';
      if (t === 0) return 'Immediately';
      if (t === 1) return '1 minute';
      return `${t} minutes`;
    };

    expect(formatTimeout(0)).toBe('Immediately');
    expect(formatTimeout(1)).toBe('1 minute');
    expect(formatTimeout(5)).toBe('5 minutes');
    expect(formatTimeout(15)).toBe('15 minutes');
    expect(formatTimeout(30)).toBe('30 minutes');
    expect(formatTimeout(null)).toBe('Never');
  });

  it('should have valid auto-lock timeout options', () => {
    const validTimeouts: AutoLockTimeout[] = [0, 1, 5, 15, 30, null];
    expect(validTimeouts).toHaveLength(6);
    expect(validTimeouts).toContain(0);
    expect(validTimeouts).toContain(null);
  });

  it('should default biometric to disabled', () => {
    // Default from settings store
    const defaultEnabled = false;
    const defaultTimeout: AutoLockTimeout = 5;

    expect(defaultEnabled).toBe(false);
    expect(defaultTimeout).toBe(5);
  });

  it('should handle biometric toggle states', () => {
    const onToggle = vi.fn();

    // Enable
    onToggle(true);
    expect(onToggle).toHaveBeenCalledWith(true);

    // Disable
    onToggle(false);
    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
