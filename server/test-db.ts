import { prisma } from "./src/lib/prisma.js";

console.time('db');
await prisma.$queryRaw`SELECT 1`;
console.timeEnd('db');

await prisma.$disconnect();