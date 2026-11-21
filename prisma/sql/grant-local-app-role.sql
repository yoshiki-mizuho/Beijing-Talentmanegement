-- Allow talent_app to read and write tables only.
-- Run as the migration role talent: npm.cmd exec -- prisma db execute --file prisma/sql/grant-local-app-role.sql
-- prisma migrate reset recreates the schema and drops these privileges, so rerun it afterwards.
GRANT USAGE ON SCHEMA public TO talent_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO talent_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO talent_app;
ALTER DEFAULT PRIVILEGES FOR ROLE talent IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO talent_app;
ALTER DEFAULT PRIVILEGES FOR ROLE talent IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO talent_app;
