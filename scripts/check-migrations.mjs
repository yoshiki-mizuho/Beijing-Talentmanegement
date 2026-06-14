import { spawnSync } from "node:child_process";
import pg from "pg";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://talent:talent_password@localhost:5432/talentmanagement?schema=public";
const shadowDatabaseUrl =
  process.env.SHADOW_DATABASE_URL ??
  databaseUrl.replace(/\/([^/?]+)(\?|$)/, "/$1_shadow$2");

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

await ensurePostgresShadowDatabase(shadowDatabaseUrl);

const result = spawnSync(
  "npx",
  [
    "prisma",
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
      SHADOW_DATABASE_URL: shadowDatabaseUrl
    },
    shell: process.platform === "win32",
    stdio: "inherit"
  }
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
