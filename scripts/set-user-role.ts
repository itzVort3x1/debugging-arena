/**
 * Grant or revoke the admin role (see POSTGRES_CHALLENGES_PLAN.md, PR B).
 *
 * The first admin has to be promoted from outside the app — there is no admin
 * UI to grant the first admin from. After that, this stays the break-glass path
 * for locking someone out without a deploy.
 *
 *   List current admins (read-only):
 *     npx tsx --env-file=.env scripts/set-user-role.ts
 *
 *   Promote / demote:
 *     npx tsx --env-file=.env scripts/set-user-role.ts you@example.com ADMIN
 *     npx tsx --env-file=.env scripts/set-user-role.ts them@example.com USER
 */
import { prisma } from "../src/lib/prisma";

const ROLES = ["USER", "ADMIN"] as const;
type Role = (typeof ROLES)[number];

async function listAdmins() {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { email: true, name: true },
    orderBy: { email: "asc" },
  });
  if (admins.length === 0) {
    console.log("No admins yet. Promote one with:");
    console.log(
      "  npx tsx --env-file=.env scripts/set-user-role.ts <email> ADMIN",
    );
    return;
  }
  console.log(`${admins.length} admin(s):`);
  for (const a of admins) console.log(`  ${a.email}${a.name ? ` (${a.name})` : ""}`);
}

async function main() {
  const [emailArg, roleArg] = process.argv.slice(2);

  if (!emailArg) {
    await listAdmins();
    return;
  }

  if (!roleArg) {
    throw new Error(
      `Missing role. Usage: set-user-role.ts <email> <${ROLES.join("|")}>`,
    );
  }
  const role = roleArg.toUpperCase() as Role;
  if (!ROLES.includes(role)) {
    throw new Error(`Unknown role "${roleArg}" (expected ${ROLES.join(" or ")})`);
  }

  const email = emailArg.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  });
  if (!user) throw new Error(`No user with email "${email}"`);

  if (user.role === role) {
    console.log(`${user.email} is already ${role}; nothing to do.`);
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { role } });
  console.log(`${user.email}: ${user.role} -> ${role}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
