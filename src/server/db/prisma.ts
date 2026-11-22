import { AsyncLocalStorage } from "node:async_hooks";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";

const tenantStorage = new AsyncLocalStorage<string>();

const globalForPrisma = globalThis as unknown as {
  prismaBase?: PrismaClient;
};

const base =
  globalForPrisma.prismaBase ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL
    }),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = base;
}

// Prisma の問い合わせは await されたときに動くので、fn の結果をこの中で await し、
// 問い合わせを返すだけの fn でもテナントを設定した状態で実行されるようにする。
export function runWithTenant<T>(
  tenantId: string,
  fn: () => T | PromiseLike<T>
): Promise<T> {
  return tenantStorage.run(tenantId, async () => await fn());
}

export async function getTenantId() {
  const storedTenantId = tenantStorage.getStore();

  if (storedTenantId) {
    return storedTenantId;
  }

  let tenantId: string | undefined;

  try {
    // next/headers はリクエストの中でだけ要る。seed や E2E の準備（Next.js の外）でも
    // このファイルを読み込めるように、使うときに読み込む。
    const { headers } = await import("next/headers");
    tenantId = (await headers()).get("x-auth-tenant-id")?.trim();
  } catch {
    throw new Error("A tenant ID is required before accessing the database.");
  }

  if (!tenantId) {
    throw new Error("A tenant ID is required before accessing the database.");
  }

  return tenantId;
}

function setTenant(tenantId: string) {
  return base.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
}

const extended = base.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, args, query }) {
        if (model === "HubTenant") {
          return query(args);
        }
        const tenantId = await getTenantId();
        const [, result] = await base.$transaction([
          setTenant(tenantId),
          query(args)
        ]);
        return result;
      }
    }
  }
});

type TransactionCallback = (
  transaction: Prisma.TransactionClient
) => Promise<unknown>;

async function runTransaction(
  callback: TransactionCallback,
  options?: {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
  }
) {
  const tenantId = await getTenantId();

  return base.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return callback(transaction);
  }, options);
}

async function runRaw(method: "$queryRaw" | "$executeRaw", args: unknown[]) {
  const tenantId = await getTenantId();
  const raw = Reflect.apply(base[method], base, args) as Prisma.PrismaPromise<unknown>;
  const [, result] = await base.$transaction([setTenant(tenantId), raw]);
  return result;
}

export const prisma = new Proxy(extended, {
  get(target, property, receiver) {
    if (property === "$transaction") {
      return runTransaction;
    }

    if (property === "$queryRaw" || property === "$executeRaw") {
      return (...args: unknown[]) => runRaw(property, args);
    }

    return Reflect.get(target, property, receiver);
  }
}) as unknown as PrismaClient;
