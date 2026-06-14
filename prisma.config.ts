import "dotenv/config";
import { defineConfig, env } from "prisma/config";

function defaultShadowDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

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
    url: env("DATABASE_URL"),
    shadowDatabaseUrl:
      process.env.SHADOW_DATABASE_URL ?? defaultShadowDatabaseUrl()
  }
});
