// Test mock for generated Prisma client.
// The real client uses import.meta.url which Jest can't parse outside a module.
export const $Enums = {
  Level: { EASY: 'EASY', MEDIUM: 'MEDIUM', HARD: 'HARD' },
};
export const Level = { EASY: 'EASY', MEDIUM: 'MEDIUM', HARD: 'HARD' };

class PrismaClient {
  constructor(_opts?: any) {}
  $connect(): Promise<void> { return Promise.resolve(); }
  $disconnect(): Promise<void> { return Promise.resolve(); }
  $transaction<T>(_fn: any): Promise<T> { return Promise.resolve(null as unknown as T); }
  [key: string]: any;
}

export const PrismaClient = PrismaClient as any;
export { PrismaClient as default };
