const MINIMUM_SECRET_LENGTH = 32;

type Env = Readonly<Record<string, string | undefined>>;

// next-auth v4 と同じ順で読む（NEXTAUTH_SECRET を優先し、なければ AUTH_SECRET）
export function resolveAuthSecret(env: Env = process.env) {
  return env.NEXTAUTH_SECRET || env.AUTH_SECRET || undefined;
}

export function assertProductionAuthSecret(env: Env = process.env) {
  if (
    env.NODE_ENV !== "production" ||
    env.NEXT_PHASE === "phase-production-build"
  ) {
    return;
  }

  const secret = resolveAuthSecret(env);
  if (!secret || secret.length < MINIMUM_SECRET_LENGTH) {
    throw new Error(
      `AUTH_SECRET (or NEXTAUTH_SECRET) must be at least ${MINIMUM_SECRET_LENGTH} characters in production.`
    );
  }
}
