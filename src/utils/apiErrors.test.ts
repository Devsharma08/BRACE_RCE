import { describe, expect, it } from 'vitest';
import { formatApiValidationError } from './apiErrors';

describe('formatApiValidationError', () => {
  it('formats all field errors for a shared page-wide notification', () => {
    expect(formatApiValidationError({
      status: 'error',
      message: 'Validation failed',
      errors: [
        { field: 'username', message: 'Username must be at least 3 characters' },
        { field: 'email', message: 'Invalid email format' },
      ],
    })).toEqual({
      title: 'Please check your input',
      description: 'username: Username must be at least 3 characters · email: Invalid email format',
    });
  });

  it('ignores malformed or empty error payloads', () => {
    expect(formatApiValidationError({ message: 'Validation failed', errors: [] })).toBeNull();
    expect(formatApiValidationError({ errors: [{ field: 'username' }] })).toBeNull();
    expect(formatApiValidationError(null)).toBeNull();
  });
});
