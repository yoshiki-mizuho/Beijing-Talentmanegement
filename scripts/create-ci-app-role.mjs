import pg from "pg";

const databaseUrl = process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL;
const appPassword = process.env.CI_APP_DATABASE_PASSWORD;

if (!databaseUrl || !appPassword) {
  throw new Error("MIGRATE_DATABASE_URL and CI_APP_DATABASE_PASSWORD are required.");
}

const escapedPassword = appPassword.replaceAll("'", "''");
const client = new pg.Client({ connectionString: databaseUrl });

await client.connect();

try {
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'talent_app') THEN
        CREATE ROLE talent_app
          LOGIN
          PASSWORD '${escapedPassword}'
          NOSUPERUSER
          NOCREATEDB
          NOCREATEROLE
          NOINHERIT
          NOBYPASSRLS;
      END IF;
    END
    $$;
    GRANT CONNECT ON DATABASE talentmanagement TO talent_app;
    GRANT USAGE ON SCHEMA public TO talent_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO talent_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO talent_app;
    ALTER DEFAULT PRIVILEGES FOR ROLE talent IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO talent_app;
    ALTER DEFAULT PRIVILEGES FOR ROLE talent IN SCHEMA public
      GRANT USAGE, SELECT ON SEQUENCES TO talent_app;
  `);
} finally {
  await client.end();
}
