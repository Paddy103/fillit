import type { AuthProvider } from './auth/types.js';

export type Variables = {
  requestId: string;
  userId: string;
  authProvider: AuthProvider;
};

export type AppEnv = {
  Variables: Variables;
};
