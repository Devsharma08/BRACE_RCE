import { prisma } from "../lib/prisma.js";
import { pruneNotificationsOlderThan } from "../services/notificationService.js";

async function main() {
  const res = await pruneNotificationsOlderThan(3);
  console.log(`[prune] deleted ${res.count} notifications older than 3 days`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
