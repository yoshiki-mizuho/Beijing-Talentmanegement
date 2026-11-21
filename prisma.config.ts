import "dotenv/config";
import { defineConfig, env } from "prisma/config";

function defaultShadowDatabaseUrl(databaseUrl: string | undefined) {

  if (!databaseUrl) {
    return undefined;
  }

  const url = new URL(databaseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}_shadow`;
  return url.toString();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    url: process.env.MIGRATE_DATABASE_URL ?? env("DATABASE_URL"),
    shadowDatabaseUrl:
      process.env.SHADOW_DATABASE_URL ??
      defaultShadowDatabaseUrl(
        process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL
      )
  }
});
