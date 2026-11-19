const localDatabaseHosts = new Set(["localhost", "127.0.0.1", "postgres"]);

export function assertDemoSeedAllowed(
  databaseUrl: string | undefined,
  allowDemoSeed: string | undefined
) {
  let isLocalDatabase = false;
  try {
    isLocalDatabase = databaseUrl
      ? localDatabaseHosts.has(new URL(databaseUrl).hostname)
      : false;
  } catch {
    isLocalDatabase = false;
  }

  if (!isLocalDatabase && allowDemoSeed !== "true") {
    throw new Error(
      "Demo seed is disabled for this database. Set ALLOW_DEMO_SEED=true only when demo data is intended."
    );
  }
}
