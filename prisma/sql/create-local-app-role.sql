-- Create the local application role talent_app (run once as postgres).
-- Table privileges are granted by grant-local-app-role.sql (rerun after migrate reset).
\if :{?app_password}
\else
  \error 'app_password must be supplied with -v app_password=...'
\endif

CREATE ROLE talent_app
  LOGIN
  PASSWORD :'app_password'
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOBYPASSRLS;

GRANT CONNECT ON DATABASE talentmanagement TO talent_app;
