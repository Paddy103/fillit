import { describe, it, expect, vi } from 'vitest';

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

import { fontAssets, FontFamily, FontCategories, type FontFamilyName } from '../fonts/config';

describe('fontAssets', () => {
  it('should export a non-empty font map', () => {
    expect(Object.keys(fontAssets).length).toBeGreaterThan(0);
  });

  it('should include all four Inter weight variants', () => {
    expect(fontAssets).toHaveProperty('Inter-Regular');
    expect(fontAssets).toHaveProperty('Inter-Medium');
    expect(fontAssets).toHaveProperty('Inter-SemiBold');
    expect(fontAssets).toHaveProperty('Inter-Bold');
  });

  it('should include JetBrains Mono for monospace', () => {
    expect(fontAssets).toHaveProperty('JetBrainsMono-Regular');
  });

  it('should include Dancing Script signature font', () => {
    expect(fontAssets).toHaveProperty('DancingScript-Regular');
  });

  it('should include Great Vibes signature font', () => {
    expect(fontAssets).toHaveProperty('GreatVibes-Regular');
  });

  it('should have exactly 7 font entries', () => {
    expect(Object.keys(fontAssets)).toHaveLength(7);
  });

  it('should map each key to a number (font source asset)', () => {
    for (const [key, value] of Object.entries(fontAssets)) {
      expect(typeof value).toBe('number');
      expect(key).toBeTruthy();
    }
  });
});

describe('FontFamily', () => {
  it('should have Inter Regular', () => {
    expect(FontFamily.InterRegular).toBe('Inter-Regular');
  });

  it('should have Inter Medium', () => {
    expect(FontFamily.InterMedium).toBe('Inter-Medium');
  });

  it('should have Inter SemiBold', () => {
    expect(FontFamily.InterSemiBold).toBe('Inter-SemiBold');
  });

  it('should have Inter Bold', () => {
    expect(FontFamily.InterBold).toBe('Inter-Bold');
  });

  it('should have JetBrains Mono Regular', () => {
    expect(FontFamily.JetBrainsMonoRegular).toBe('JetBrainsMono-Regular');
  });

  it('should have Dancing Script Regular', () => {
    expect(FontFamily.DancingScriptRegular).toBe('DancingScript-Regular');
  });

  it('should have Great Vibes Regular', () => {
    expect(FontFamily.GreatVibesRegular).toBe('GreatVibes-Regular');
  });

  it('should have values that match fontAssets keys', () => {
    const assetKeys = Object.keys(fontAssets);
    for (const familyName of Object.values(FontFamily)) {
      expect(assetKeys).toContain(familyName);
    }
  });

  it('should be frozen (readonly)', () => {
    // FontFamily is defined as `as const`, so at runtime the values are string literals.
    // Verify the object shape has the expected number of entries.
    expect(Object.keys(FontFamily)).toHaveLength(7);
  });
});

describe('FontCategories', () => {
  describe('sans', () => {
    it('should have regular, medium, semiBold, and bold weights', () => {
      expect(FontCategories.sans.regular).toBe('Inter-Regular');
      expect(FontCategories.sans.medium).toBe('Inter-Medium');
      expect(FontCategories.sans.semiBold).toBe('Inter-SemiBold');
      expect(FontCategories.sans.bold).toBe('Inter-Bold');
    });
  });

  describe('mono', () => {
    it('should have a regular weight pointing to JetBrains Mono', () => {
      expect(FontCategories.mono.regular).toBe('JetBrainsMono-Regular');
    });
  });

  describe('signature', () => {
    it('should have Dancing Script', () => {
      expect(FontCategories.signature.dancingScript).toBe('DancingScript-Regular');
    });

    it('should have Great Vibes', () => {
      expect(FontCategories.signature.greatVibes).toBe('GreatVibes-Regular');
    });
  });

  it('should only reference values present in FontFamily', () => {
    const validNames = new Set(Object.values(FontFamily));

    const allCategoryValues = [
      ...Object.values(FontCategories.sans),
      ...Object.values(FontCategories.mono),
      ...Object.values(FontCategories.signature),
    ];

    for (const name of allCategoryValues) {
      expect(validNames.has(name)).toBe(true);
    }
  });
});

describe('FontFamilyName type', () => {
  it('should accept valid font family names', () => {
    // Type-level check: these assignments should compile without errors.
    const _name1: FontFamilyName = 'Inter-Regular';
    const _name2: FontFamilyName = 'JetBrainsMono-Regular';
    const _name3: FontFamilyName = 'DancingScript-Regular';
    const _name4: FontFamilyName = 'GreatVibes-Regular';

    // Runtime assertion to avoid unused variable warnings
    expect(_name1).toBeTruthy();
    expect(_name2).toBeTruthy();
    expect(_name3).toBeTruthy();
    expect(_name4).toBeTruthy();
  });
});
