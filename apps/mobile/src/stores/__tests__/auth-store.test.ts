/**
 * Tests for auth store.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));
import { useAuthStore, type AuthUser } from '../auth-store';

describe('auth-store', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  const mockUser: AuthUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    photo: 'https://photo.url',
    provider: 'google',
  };

  describe('setUser', () => {
    it('should set authenticated user', () => {
      useAuthStore.getState().setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.provider).toBe('google');
      expect(state.error).toBeNull();
    });

    it('should clear loading state on set', () => {
      useAuthStore.setState({ isLoading: true });
      useAuthStore.getState().setUser(mockUser);

      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('clearUser', () => {
    it('should clear auth state', () => {
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().clearUser();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.provider).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);

      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('setReady', () => {
    it('should mark auth as ready', () => {
      expect(useAuthStore.getState().isReady).toBe(false);

      useAuthStore.getState().setReady();

      expect(useAuthStore.getState().isReady).toBe(true);
    });
  });

  describe('setError', () => {
    it('should set error and clear loading', () => {
      useAuthStore.setState({ isLoading: true });
      useAuthStore.getState().setError('Auth failed');

      const state = useAuthStore.getState();
      expect(state.error).toBe('Auth failed');
      expect(state.isLoading).toBe(false);
    });

    it('should clear error', () => {
      useAuthStore.getState().setError('Some error');
      useAuthStore.getState().setError(null);

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset to default state', () => {
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setReady();
      useAuthStore.getState().reset();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isReady).toBe(false);
    });
  });

  describe('Apple provider', () => {
    it('should handle Apple user', () => {
      const appleUser: AuthUser = {
        id: 'apple-user',
        email: 'xyz@privaterelay.appleid.com',
        name: 'John Doe',
        photo: null,
        provider: 'apple',
      };

      useAuthStore.getState().setUser(appleUser);

      expect(useAuthStore.getState().provider).toBe('apple');
      expect(useAuthStore.getState().user?.email).toBe('xyz@privaterelay.appleid.com');
    });
  });
});
