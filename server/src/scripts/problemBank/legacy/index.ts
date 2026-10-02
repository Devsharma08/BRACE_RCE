import type { LegacyEntry } from './types.js';
import { batch1 } from './batch1.js';
import { batch2 } from './batch2.js';
import { batch3 } from './batch3.js';
import { batch4 } from './batch4.js';

export const LEGACY: LegacyEntry[] = [...batch1, ...batch2, ...batch3, ...batch4];
export { OPERATION_SEQUENCE, UNREPRESENTABLE_INPUT } from './types.js';
export type { LegacyEntry } from './types.js';
