import { spawnSync } from "node:child_process";
import path from "node:path";
import { delimiter } from "node:path";
import pg from "pg";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://talent:talent_password@localhost:5432/talentmanagement?schema=public";
const shadowDatabaseUrl =
  process.env.SHADOW_DATABASE_URL ??
  databaseUrl.replace(/\/([^/?]+)(\?|$)/, "/$1_shadow$2");
const prismaBinary = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prisma.cmd" : "prisma"
);

async function ensurePostgresShadowDatabase(url) {
  const shadowUrl = new URL(url);
  const databaseName = shadowUrl.pathname.replace(/^\//, "");

  if (!databaseName) {
    return;
  }

  const maintenanceUrl = new URL(shadowUrl);
  maintenanceUrl.pathname = "/postgres";
  maintenanceUrl.search = "";

  const client = new pg.Client({
    connectionString: maintenanceUrl.toString()
  });

  await client.connect();

  try {
    await client.query(`CREATE DATABASE "${databaseName.replaceAll('"', '""')}"`);
  } catch (error) {
    if (error?.code !== "42P04") {
      throw error;
    }
  } finally {
    await client.end();
  }
}

// Prisma 7 requires shadowDatabaseUrl when diffing from a migrations directory.
await ensurePostgresShadowDatabase(shadowDatabaseUrl);

const result = spawnSync(
  prismaBinary,
  [
    "migrate",
    "diff",
    "--from-migrations",
    "prisma/migrations",
    "--to-schema",
    "prisma/schema.prisma",
    "--exit-code"
  ],
  {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      SHADOW_DATABASE_URL: shadowDatabaseUrl,
      PATH: [path.dirname(process.execPath), process.env.PATH]
        .filter(Boolean)
        .join(delimiter)
    },
    shell: process.platform === "win32",
    stdio: "inherit"
  }
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
