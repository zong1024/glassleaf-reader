import { prisma } from "./lib/prisma.js";
import { hashPassword, normalizeEmail } from "./lib/security.js";

const email = normalizeEmail(process.env.SEED_EMAIL ?? "demo@glassleaf.local");
const password = process.env.SEED_PASSWORD ?? "ChangeMe123!";
const displayName = process.env.SEED_DISPLAY_NAME ?? "Demo Reader";

const user = await prisma.user.upsert({
  where: {
    email,
  },
  update: {
    displayName,
    passwordHash: await hashPassword(password),
  },
  create: {
    email,
    displayName,
    passwordHash: await hashPassword(password),
  },
});

console.log(`Seeded demo user: ${user.email}`);

await prisma.$disconnect();
