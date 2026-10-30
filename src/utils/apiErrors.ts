export interface ApiValidationError {
  title: string;
  description: string;
}

export function formatApiValidationError(data: unknown): ApiValidationError | null {
  if (!data || typeof data !== 'object' || !('errors' in data) || !Array.isArray(data.errors)) {
    return null;
  }

  const details = data.errors.flatMap((error: unknown) => {
    if (!error || typeof error !== 'object') return [];

    const field = 'field' in error && typeof error.field === 'string' ? error.field.trim() : '';
    const message = 'message' in error && typeof error.message === 'string' ? error.message.trim() : '';
    if (!message) return [];

    return [field ? `${field}: ${message}` : message];
  });

  if (details.length === 0) return null;

  return {
    title: 'Please check your input',
    description: details.join(' · '),
  };
}
