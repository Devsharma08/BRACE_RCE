// Test mock for uuid@14 (ESM-only package that Jest can't parse directly)
// Provides CJS-compatible exports that match uuid v4/v1/v5 API surface.

export const v4 = (options?: any): string => 'test-uuid-v4-' + Math.random().toString(36).slice(2, 10);
export const v1 = (options?: any): string => 'test-uuid-v1-' + Math.random().toString(36).slice(2, 10);
export const v5 = (namespace: string, name: string): string => 'test-uuid-v5';
export const validate = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id ?? '');
export const version = (id: string): number | null => (validate(id) ? 4 : null);
export const NIL = '00000000-0000-0000-0000-000000000000';
export const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
export const error = {
  VersionError: class VersionError extends Error {
    constructor() {
      super('Unsupported UUID version');
      this.name = 'VersionError';
    }
  },
};

export default {
  v4,
  v1,
  v5,
  validate,
  version,
  NIL,
  MAX,
};
