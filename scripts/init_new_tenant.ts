/**
 * Interactive script to onboard a new tenant (retail store) with one admin user.
 * Run: npx tsx scripts/init_new_tenant.ts
 */

import { createInterface } from "readline";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function askPassword(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    let password = "";

    const handler = (char: string) => {
      if (char === "\r" || char === "\n") {
        // Enter — done
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", handler);
        process.stdout.write("\n");
        resolve(password);
      } else if (char === "") {
        // Ctrl+C
        process.stdout.write("\n");
        process.exit(0);
      } else if (char === "" || char === "\b") {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else {
        password += char;
        process.stdout.write("*");
      }
    };

    process.stdin.on("data", handler);
  });
}

function hr() {
  console.log("─".repeat(50));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n");
  hr();
  console.log("  pscanner — New Tenant Setup");
  hr();
  console.log("  This creates a new store tenant and one admin user.");
  console.log("  Additional users can be added via the portal later.\n");

  // ── Tenant details ──────────────────────────────────────────────────────────

  const tenantName = await ask("  Store name         : ");
  if (!tenantName) {
    console.error("\n  Error: Store name is required.\n");
    process.exit(1);
  }

  const defaultSlug = slugify(tenantName);
  const slugInput = await ask(`  Store slug         : [${defaultSlug}] `);
  const tenantSlug = slugInput || defaultSlug;

  if (!/^[a-z0-9-]+$/.test(tenantSlug)) {
    console.error("\n  Error: Slug can only contain lowercase letters, numbers, and hyphens.\n");
    process.exit(1);
  }

  const planInput = await ask("  Plan (starter/growth/enterprise) : [starter] ");
  const plan = ["starter", "growth", "enterprise"].includes(planInput) ? planInput : "starter";

  // ── Admin user details ──────────────────────────────────────────────────────

  console.log("");
  const adminName = await ask("  Admin name         : ");
  if (!adminName) {
    console.error("\n  Error: Admin name is required.\n");
    process.exit(1);
  }

  const adminEmail = await ask("  Admin email        : ");
  if (!adminEmail || !adminEmail.includes("@")) {
    console.error("\n  Error: A valid email address is required.\n");
    process.exit(1);
  }

  const password = await askPassword("  Admin password     : ");
  if (password.length < 4) {
    console.error("\n  Error: Password must be at least 4 characters.\n");
    process.exit(1);
  }

  // ── Confirm ─────────────────────────────────────────────────────────────────

  console.log("");
  hr();
  console.log("  Review before creating:\n");
  console.log(`    Store name  : ${tenantName}`);
  console.log(`    Store slug  : ${tenantSlug}`);
  console.log(`    Plan        : ${plan}`);
  console.log(`    Admin name  : ${adminName}`);
  console.log(`    Admin email : ${adminEmail}`);
  console.log("");
  const confirm = await ask("  Confirm? (yes/no)  : ");

  if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
    console.log("\n  Cancelled. Nothing was created.\n");
    process.exit(0);
  }

  // ── Validate uniqueness ──────────────────────────────────────────────────────

  const existingTenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (existingTenant) {
    console.error(`\n  Error: A tenant with slug "${tenantSlug}" already exists.\n`);
    process.exit(1);
  }

  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingUser) {
    console.error(`\n  Error: A user with email "${adminEmail}" already exists.\n`);
    process.exit(1);
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  console.log("\n  Creating tenant and admin user...");

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: tenantName,
        slug: tenantSlug,
        plan,
        status: "active",
      },
    });

    const user = await tx.user.create({
      data: {
        tenant_id: tenant.id,
        email: adminEmail,
        name: adminName,
        role: "admin",
        password_hash: passwordHash,
        is_active: true,
      },
    });

    return { tenant, user };
  });

  // ── Done ─────────────────────────────────────────────────────────────────────

  console.log("");
  hr();
  console.log("  Tenant created successfully!\n");
  console.log(`    Tenant ID   : ${result.tenant.id}`);
  console.log(`    Store name  : ${result.tenant.name}`);
  console.log(`    Store slug  : ${result.tenant.slug}`);
  console.log(`    Plan        : ${result.tenant.plan}`);
  console.log("");
  console.log(`    User ID     : ${result.user.id}`);
  console.log(`    Admin name  : ${result.user.name}`);
  console.log(`    Admin email : ${result.user.email}`);
  console.log(`    Role        : ${result.user.role}`);
  console.log("");
  console.log(`    Login at    : ${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/login`);
  hr();
  console.log("");
}

main()
  .catch((err) => {
    console.error("\n  Error:", err.message ?? err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
