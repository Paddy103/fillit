import type { ErrorHandler } from 'hono';
import type { AppEnv } from '../types.js';
import { AppError } from '../utils/errors.js';

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  const requestId = c.get('requestId');

  console.error(
    JSON.stringify({
      type: 'error',
      requestId,
      message: err.message,
      stack: err.stack,
      name: err.name,
    }),
  );

  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        error: {
          code: err.code,
          message: err.message,
        },
      },
      err.statusCode as 400 | 401 | 403 | 404 | 500,
    );
  }

  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    500,
  );
};
