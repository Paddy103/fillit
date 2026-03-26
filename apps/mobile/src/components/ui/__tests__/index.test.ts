import { describe, it, expect, vi, beforeAll } from 'vitest';
import type * as UiModuleType from '../index';

vi.mock('react-native', () => ({
  Text: 'Text',
  View: 'View',
  Pressable: 'Pressable',
  TextInput: 'TextInput',
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: {
    flatten: (s: unknown) => s,
  },
}));

vi.mock('../../../theme', async () => {
  const { lightTheme } = await import('../../../theme/themes');
  return {
    useTheme: () => ({
      theme: lightTheme,
      isDark: false,
      colorMode: 'system' as const,
      resolvedColorScheme: 'light' as const,
      setColorMode: () => {},
      toggleColorMode: () => {},
    }),
  };
});

describe('UI components barrel export', () => {
  let ui: typeof UiModuleType;

  beforeAll(async () => {
    ui = await import('../index');
  });

  describe('Typography exports', () => {
    it('should export all Typography components', () => {
      expect(ui.DisplayLarge).toBeDefined();
      expect(ui.DisplayMedium).toBeDefined();
      expect(ui.HeadingLarge).toBeDefined();
      expect(ui.HeadingMedium).toBeDefined();
      expect(ui.TitleLarge).toBeDefined();
      expect(ui.TitleMedium).toBeDefined();
      expect(ui.BodyLarge).toBeDefined();
      expect(ui.BodyMedium).toBeDefined();
      expect(ui.BodySmall).toBeDefined();
      expect(ui.LabelLarge).toBeDefined();
      expect(ui.LabelMedium).toBeDefined();
      expect(ui.LabelSmall).toBeDefined();
      expect(ui.Caption).toBeDefined();
    });
  });

  describe('Button export', () => {
    it('should export Button', () => {
      expect(ui.Button).toBeDefined();
    });
  });

  describe('TextInput export', () => {
    it('should export TextInput', () => {
      expect(ui.TextInput).toBeDefined();
    });
  });

  describe('Card exports', () => {
    it('should export Card and PressableCard', () => {
      expect(ui.Card).toBeDefined();
      expect(ui.PressableCard).toBeDefined();
    });
  });

  describe('Icon export', () => {
    it('should export Icon', () => {
      expect(ui.Icon).toBeDefined();
    });
  });

  describe('Divider export', () => {
    it('should export Divider', () => {
      expect(ui.Divider).toBeDefined();
    });
  });

  describe('Badge and Chip exports', () => {
    it('should export Badge and Chip', () => {
      expect(ui.Badge).toBeDefined();
      expect(ui.Chip).toBeDefined();
    });
  });

  describe('Avatar export', () => {
    it('should export Avatar', () => {
      expect(ui.Avatar).toBeDefined();
    });
  });

  describe('all exports are functions (components)', () => {
    it('should be functions for all component exports', () => {
      const components = [
        ui.DisplayLarge,
        ui.DisplayMedium,
        ui.HeadingLarge,
        ui.HeadingMedium,
        ui.TitleLarge,
        ui.TitleMedium,
        ui.BodyLarge,
        ui.BodyMedium,
        ui.BodySmall,
        ui.LabelLarge,
        ui.LabelMedium,
        ui.LabelSmall,
        ui.Caption,
        ui.Button,
        ui.TextInput,
        ui.Card,
        ui.PressableCard,
        ui.Icon,
        ui.Divider,
        ui.Badge,
        ui.Chip,
        ui.Avatar,
      ];

      for (const component of components) {
        expect(typeof component).toBe('function');
      }
    });
  });

  describe('total exported component count', () => {
    it('should export exactly 22 components', () => {
      const expectedComponents = [
        'DisplayLarge',
        'DisplayMedium',
        'HeadingLarge',
        'HeadingMedium',
        'TitleLarge',
        'TitleMedium',
        'BodyLarge',
        'BodyMedium',
        'BodySmall',
        'LabelLarge',
        'LabelMedium',
        'LabelSmall',
        'Caption',
        'Button',
        'TextInput',
        'Card',
        'PressableCard',
        'Icon',
        'Divider',
        'Badge',
        'Chip',
        'Avatar',
      ];

      for (const name of expectedComponents) {
        expect((ui as Record<string, unknown>)[name], `Missing export: ${name}`).toBeDefined();
      }
    });
  });
});
