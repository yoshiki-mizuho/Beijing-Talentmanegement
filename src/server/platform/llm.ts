import path from "node:path";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

import { getTenantId } from "@/server/db/prisma";

const PROTO_PATH = path.join(
  process.cwd(),
  "contract/proto/llm/v1/llm_service.proto",
);
const DEADLINE_MS = 6 * 60 * 1000;
export const LLM_INPUT_BYTE_LIMIT = 24_000;
export const LLM_RECOMMENDED_CHARACTER_LIMIT = 3_000;

type GenerateResponse = { text: string; modelUsed: string };
type UnaryCallback = (
  error: grpc.ServiceError | null,
  response?: GenerateResponse,
) => void;
type LlmServiceClient = grpc.Client & {
  generate(
    request: object,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: UnaryCallback,
  ): grpc.ClientUnaryCall;
};
type LlmServiceConstructor = new (
  address: string,
  credentials: grpc.ChannelCredentials,
) => LlmServiceClient;

let client: LlmServiceClient | undefined;

export class PlatformLlmError extends Error {
  constructor(
    public readonly code: grpc.status,
    public readonly reason: string | null,
    options?: ErrorOptions,
  ) {
    super("基盤の LLM を利用できませんでした。", options);
    this.name = "PlatformLlmError";
  }
}

function createClient() {
  const address = process.env.PLATFORM_LLM_GRPC_ADDR?.trim();
  if (!address) {
    throw new Error("PLATFORM_LLM_GRPC_ADDR is required to call the platform LLM.");
  }
  const definition = protoLoader.loadSync(PROTO_PATH, {
    defaults: true,
    enums: String,
    keepCase: false,
    longs: String,
    oneofs: true,
  });
  const loaded = grpc.loadPackageDefinition(definition) as unknown as {
    llm: { v1: { LLMService: LlmServiceConstructor } };
  };
  return new loaded.llm.v1.LLMService(
    address,
    grpc.credentials.createInsecure(),
  );
}

function resourceReason(details: string) {
  const normalized = details.toLowerCase();
  for (const reason of [
    "external daily quota",
    "daily quota",
    "batch window",
    "busy",
  ]) {
    if (normalized.includes(reason)) return reason;
  }
  return null;
}

export function llmInputBytes(...parts: string[]) {
  return Buffer.byteLength(parts.join(""), "utf8");
}

export function assertLlmInput(
  systemPrompt: string,
  userPrompt: string,
  jsonSchemaHint = "",
) {
  if (
    llmInputBytes(systemPrompt, userPrompt, jsonSchemaHint) >
    LLM_INPUT_BYTE_LIMIT
  ) {
    throw new PlatformLlmError(grpc.status.INVALID_ARGUMENT, "input too long");
  }
}

export async function generatePlatformText(input: {
  systemPrompt: string;
  userPrompt: string;
  // 返してほしい JSON の形の見本。基盤が本文の後ろに足して LLM に渡す（guide §4.9）。
  jsonSchemaHint?: string;
  requestId: string;
}) {
  assertLlmInput(input.systemPrompt, input.userPrompt, input.jsonSchemaHint);
  const tenantId = await getTenantId();
  const product = process.env.HUB_NAME?.trim();
  if (!product) throw new Error("HUB_NAME is required to call the platform LLM.");

  const metadata = new grpc.Metadata();
  metadata.set("x-tenant-id", tenantId);
  metadata.set("x-request-id", input.requestId);
  const target = client ??= createClient();

  return new Promise<{ text: string; model: string }>((resolve, reject) => {
    target.generate(
      {
        systemPrompt: input.systemPrompt,
        userPrompt: input.userPrompt,
        outputFormat: "OUTPUT_FORMAT_JSON",
        jsonSchemaHint: input.jsonSchemaHint ?? "",
        model: "",
        product,
        allowExternal: false,
      },
      metadata,
      { deadline: Date.now() + DEADLINE_MS },
      (error, response) => {
        if (error) {
          reject(new PlatformLlmError(
            error.code,
            error.code === grpc.status.RESOURCE_EXHAUSTED
              ? resourceReason(error.details)
              : null,
            { cause: error },
          ));
          return;
        }
        resolve({
          text: response?.text ?? "",
          model: response?.modelUsed ?? "",
        });
      },
    );
  });
}

export function resetPlatformLlmClientForTests() {
  client?.close();
  client = undefined;
}
