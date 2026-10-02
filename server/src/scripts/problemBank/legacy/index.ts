import type { LegacyEntry } from './types.js';
import { batch1 } from './batch1.js';
import { batch2 } from './batch2.js';
import { batch3 } from './batch3.js';
import { batch4 } from './batch4.js';
import { batch5 } from './batch5.js';
import { batch6 } from './batch6.js';
import { batch7 } from './batch7.js';

export const LEGACY: LegacyEntry[] = [...batch1, ...batch2, ...batch3, ...batch4, ...batch5, ...batch6, ...batch7];
export { OPERATION_SEQUENCE, UNREPRESENTABLE_INPUT } from './types.js';
export type { LegacyEntry } from './types.js';
