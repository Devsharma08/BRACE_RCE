import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders, type AxiosAdapter } from 'axios';
import { QueryClient } from '@tanstack/react-query';

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));

vi.mock('sonner', () => ({
  toast: { error: toastError },
}));

import { api, wireAuthInvalidation } from './api';

describe('API validation error notifications', () => {
  const originalAdapter = api.defaults.adapter;

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    toastError.mockClear();
  });

  it('does NOT show a global toast for validation errors (components handle their own)', async () => {
    const client = new QueryClient();
    wireAuthInvalidation(client);

    api.defaults.adapter = (async (config) => {
      const response = {
        config,
        data: {
          status: 'error',
          message: 'Validation failed',
          errors: [{ field: 'username', message: 'Username must be at least 3 characters' }],
        },
        headers: new AxiosHeaders(),
        status: 400,
        statusText: 'Bad Request',
      };
      return Promise.reject(new AxiosError('Request failed', AxiosError.ERR_BAD_REQUEST, config, undefined, response));
    }) as AxiosAdapter;

    await expect(api.post('/auth/signup', {})).rejects.toBeDefined();

    // The global interceptor should NOT display its own toast; component
    // catch blocks own error display to prevent duplicates.
    expect(toastError).not.toHaveBeenCalled();
    client.clear();
  });
});
