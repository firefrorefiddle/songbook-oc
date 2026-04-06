/**
 * QA setup using node:sqlite + bcryptjs (avoids pnpm resolving a stale Prisma client for tsx).
 * Run: pnpm exec tsx scripts/qa-browser-setup.ts
 */
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

function resolveDbPath(): string {
  const envPath = process.env.DATABASE_URL?.replace(/^file:/, "");
  if (envPath) {
    const abs = join(projectRoot, envPath);
    if (existsSync(abs)) {
      return abs;
    }
  }
  const prismaDb = join(projectRoot, "prisma", "dev.db");
  if (existsSync(prismaDb)) {
    return prismaDb;
  }
  return join(projectRoot, "dev.db");
}

const ADMIN_EMAIL = "firefrorefiddle@test.local";
const ADMIN_USERNAME = "firefrorefiddle";
const ADMIN_PASSWORD = "ecro5fEg";

function main() {
  const dbPath = resolveDbPath();
  console.log(`Using database: ${dbPath}`);

  const db = new DatabaseSync(dbPath);
  const admin = db
    .prepare(`SELECT id FROM User WHERE role = 'ADMIN' ORDER BY createdAt LIMIT 1`)
    .get() as { id: string } | undefined;
  if (!admin) {
    console.error("No ADMIN user found.");
    process.exit(1);
  }

  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  db.prepare(
    `UPDATE User SET email = ?, username = ?, passwordHash = ?, role = 'ADMIN', isActive = 1 WHERE id = ?`,
  ).run(ADMIN_EMAIL, ADMIN_USERNAME, passwordHash, admin.id);

  console.log(`Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} (username login: ${ADMIN_USERNAME})`);

  const invites = [
    { email: "qa-alice@test.local", token: "qa-invite-token-alice-001" },
    { email: "qa-bob@test.local", token: "qa-invite-token-bob-002" },
    { email: "qa-carol@test.local", token: "qa-invite-token-carol-003" },
    { email: "qa-dan@test.local", token: "qa-invite-token-dan-004" },
    { email: "qa-eve@test.local", token: "qa-invite-token-eve-005" },
    { email: "qa-frank@test.local", token: "qa-invite-token-frank-006" },
    { email: "qa-grace@test.local", token: "qa-invite-token-grace-007" },
  ];

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const del = db.prepare(`DELETE FROM Invite WHERE token = ?`);
  const ins = db.prepare(`
    INSERT INTO Invite (id, email, token, role, expiresAt, emailVerifiedAt, usedAt, sentById, userId)
    VALUES (?, ?, ?, 'USER', ?, ?, NULL, ?, NULL)
  `);

  for (const inv of invites) {
    del.run(inv.token);
    ins.run(randomUUID().replace(/-/g, "").slice(0, 25), inv.email, inv.token, expiresAt, now, admin.id);
    console.log(`Invite: ${inv.email} → /signup?token=${inv.token}`);
  }

  db.close();
}

main();
