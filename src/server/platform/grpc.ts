import path from "node:path";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

import { getTenantId } from "@/server/db/prisma";

const PROTO_PATH = path.join(
  process.cwd(),
  "contract/proto/user/v1/user_service.proto"
);
const RETRY_DELAY_MS = 100;

type UnaryCallback = (error: grpc.ServiceError | null, response?: unknown) => void;
type UserServiceClient = grpc.Client & Record<
  string,
  (
    request: object,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: UnaryCallback
  ) => grpc.ClientUnaryCall
>;

type UserServiceConstructor = new (
  address: string,
  credentials: grpc.ChannelCredentials
) => UserServiceClient;

let client: UserServiceClient | undefined;

export class PlatformUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("基盤が応答しません。", options);
    this.name = "PlatformUnavailableError";
  }
}

export class PlatformTenantRequiredError extends Error {
  constructor(options?: ErrorOptions) {
    super("基盤の呼び出しにはテナント ID が必要です。", options);
    this.name = "PlatformTenantRequiredError";
  }
}

function timeoutMs() {
  const value = Number(process.env.PLATFORM_GRPC_TIMEOUT_MS ?? 3000);
  return Number.isFinite(value) && value > 0 ? value : 3000;
}

function createClient() {
  const address = process.env.PLATFORM_USER_ORG_GRPC_ADDR?.trim();

  if (!address) {
    throw new Error("PLATFORM_USER_ORG_GRPC_ADDR is required to call the platform.");
  }

  const definition = protoLoader.loadSync(PROTO_PATH, {
    defaults: true,
    enums: String,
    keepCase: false,
    longs: String,
    oneofs: true
  });
  const loaded = grpc.loadPackageDefinition(definition) as unknown as {
    user: { v1: { UserService: UserServiceConstructor } };
  };
  return new loaded.user.v1.UserService(
    address,
    grpc.credentials.createInsecure()
  );
}

async function requestMetadata() {
  let tenantId: string;

  try {
    tenantId = await getTenantId();
  } catch (error) {
    throw new PlatformTenantRequiredError({ cause: error });
  }

  const metadata = new grpc.Metadata();
  metadata.set("x-tenant-id", tenantId);

  try {
    const { headers } = await import("next/headers");
    const requestHeaders = await headers();
    const tenantSlug = requestHeaders.get("x-auth-tenant-slug")?.trim();
    const requestId = requestHeaders.get("x-auth-request-id")?.trim();

    if (tenantSlug) metadata.set("x-tenant-slug", tenantSlug);
    if (requestId) metadata.set("x-request-id", requestId);
  } catch {
    // runWithTenant を使うリクエスト外の処理では任意メタデータを省略する。
  }

  return metadata;
}

function invoke<T>(
  target: UserServiceClient,
  method: string,
  request: object,
  metadata: grpc.Metadata
) {
  return new Promise<T>((resolve, reject) => {
    target[method](
      request,
      metadata,
      { deadline: Date.now() + timeoutMs() },
      (error, response) => error ? reject(error) : resolve(response as T)
    );
  });
}

function isRetryable(error: unknown): error is grpc.ServiceError {
  return error instanceof Error && "code" in error && (
    error.code === grpc.status.UNAVAILABLE ||
    error.code === grpc.status.DEADLINE_EXCEEDED
  );
}

export function isNotFound(error: unknown): error is grpc.ServiceError {
  return error instanceof Error && "code" in error &&
    error.code === grpc.status.NOT_FOUND;
}

export async function callUserService<T>(method: string, request: object) {
  const metadata = await requestMetadata();
  const requestId = metadata.get("x-request-id")[0];
  const target = client ??= createClient();

  try {
    return await invoke<T>(target, method, request, metadata);
  } catch (firstError) {
    if (!isRetryable(firstError)) throw firstError;

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));

    try {
      return await invoke<T>(target, method, request, metadata);
    } catch (secondError) {
      if (!isRetryable(secondError)) throw secondError;
      console.error("Platform gRPC unavailable", { requestId: requestId ?? null });
      throw new PlatformUnavailableError({ cause: secondError });
    }
  }
}

export function resetPlatformGrpcClientForTests() {
  client?.close();
  client = undefined;
}
