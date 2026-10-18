// サーバーでだけ使う。クライアント部品から import しないこと（API キーを扱うため）。

export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type AiConfig =
  | { kind: "none" }
  | { kind: "fake" }
  | {
      kind: "openai-compatible";
      baseUrl: string;
      apiKey: string;
      model: string;
      timeoutMs: number;
    };

type AiErrorCode =
  | "not_configured"
  | "timeout"
  | "rate_limited"
  | "http_error"
  | "network"
  | "invalid_response";

export class AiClientError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    public readonly status?: number,
  ) {
    super(`AI request failed: ${code}`);
    this.name = "AiClientError";
  }
}

export function getAiConfig(): AiConfig {
  const baseUrl = process.env.AI_API_BASE_URL?.trim();

  if (baseUrl === "fake") {
    return { kind: "fake" };
  }

  const apiKey = process.env.AI_API_KEY?.trim();
  const model = process.env.AI_MODEL?.trim();

  if (!baseUrl || !apiKey || !model) {
    return { kind: "none" };
  }

  const configuredTimeout = Number(process.env.AI_TIMEOUT_MS);
  const timeoutMs =
    Number.isFinite(configuredTimeout) && configuredTimeout > 0
      ? configuredTimeout
      : 30_000;

  return {
    kind: "openai-compatible",
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey,
    model,
    timeoutMs,
  };
}

type ChatCompletionInput = {
  messages: AiMessage[];
  temperature?: number;
  fakeResponse?: () => string;
};

type ChatCompletionResult = {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
  latencyMs: number;
};

type ApiResponse = {
  model?: unknown;
  choices?: Array<{ message?: { content?: unknown } }>;
  usage?: {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    total_tokens?: unknown;
  };
};

const RETRY_DELAY_MS = 1_000;

export async function createChatCompletion(
  input: ChatCompletionInput,
): Promise<ChatCompletionResult> {
  const startedAt = Date.now();
  const config = getAiConfig();

  if (config.kind === "none") {
    throw new AiClientError("not_configured");
  }

  if (config.kind === "fake") {
    if (!input.fakeResponse) {
      throw new AiClientError("invalid_response");
    }

    let content: string;

    try {
      content = input.fakeResponse();
    } catch {
      throw new AiClientError("invalid_response");
    }

    if (typeof content !== "string") {
      throw new AiClientError("invalid_response");
    }

    return {
      content,
      model: "fake",
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      latencyMs: Date.now() - startedAt,
    };
  }

  const deadline = startedAt + config.timeoutMs;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const remainingMs = deadline - Date.now();

    if (remainingMs <= 0) {
      throw new AiClientError("timeout");
    }

    try {
      const response = await fetchOnce(config, input, remainingMs);

      if (response.ok) {
        return await parseResponse(response, startedAt);
      }

      const retryable = response.status === 429 || response.status >= 500;

      if (
        retryable &&
        attempt === 0 &&
        deadline - Date.now() > RETRY_DELAY_MS
      ) {
        await delay(RETRY_DELAY_MS);
        continue;
      }

      throw new AiClientError(
        response.status === 429 ? "rate_limited" : "http_error",
        response.status,
      );
    } catch (error) {
      if (error instanceof AiClientError) {
        throw error;
      }

      const timedOut = isAbortError(error) || Date.now() >= deadline;

      if (timedOut) {
        throw new AiClientError("timeout");
      }

      if (attempt === 0 && deadline - Date.now() > RETRY_DELAY_MS) {
        await delay(RETRY_DELAY_MS);
        continue;
      }

      throw new AiClientError("network");
    }
  }

  throw new AiClientError("network");
}

async function fetchOnce(
  config: Extract<AiConfig, { kind: "openai-compatible" }>,
  input: ChatCompletionInput,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: input.messages,
        temperature: input.temperature ?? 0.3,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function parseResponse(
  response: Response,
  startedAt: number,
): Promise<ChatCompletionResult> {
  let payload: ApiResponse;

  try {
    payload = (await response.json()) as ApiResponse;
  } catch {
    throw new AiClientError("invalid_response");
  }

  const content = payload.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new AiClientError("invalid_response");
  }

  const usage = payload.usage;
  const hasUsage =
    typeof usage?.prompt_tokens === "number" &&
    typeof usage.completion_tokens === "number" &&
    typeof usage.total_tokens === "number";

  return {
    content,
    model: typeof payload.model === "string" ? payload.model : "unknown",
    usage: hasUsage
      ? {
          promptTokens: usage.prompt_tokens as number,
          completionTokens: usage.completion_tokens as number,
          totalTokens: usage.total_tokens as number,
        }
      : null,
    latencyMs: Date.now() - startedAt,
  };
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
