import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AiClientError,
  createChatCompletion,
  getAiConfig,
} from "@/modules/ai-evaluation/infrastructure/ai-client";

const originalEnv = { ...process.env };
const messages = [{ role: "user" as const, content: "test" }];

function configureApi() {
  process.env.AI_API_BASE_URL = "https://ai.example.test/v1";
  process.env.AI_API_KEY = "secret-api-key";
  process.env.AI_MODEL = "test-model";
  process.env.AI_TIMEOUT_MS = "5000";
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("AI client", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    configureApi();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it("成功応答の本文と利用量を返す", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response({
        model: "returned-model",
        choices: [{ message: { content: '{"hint":"ok"}' } }],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 8,
          total_tokens: 20,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await createChatCompletion({ messages });

    expect(result).toEqual(
      expect.objectContaining({
        content: '{"hint":"ok"}',
        model: "returned-model",
        usage: { promptTokens: 12, completionTokens: 8, totalTokens: 20 },
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://ai.example.test/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer secret-api-key",
          "Content-Type": "application/json",
        },
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      model: "test-model",
      messages,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });
  });

  it("期限を超えた通信を中断する", async () => {
    process.env.AI_TIMEOUT_MS = "10";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => {
              reject(new DOMException("aborted", "AbortError"));
            });
          }),
      ),
    );

    await expect(createChatCompletion({ messages })).rejects.toMatchObject({
      code: "timeout",
    });
  });

  it("429の後に1回再試行して成功する", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({}, 429))
      .mockResolvedValueOnce(
        response({ choices: [{ message: { content: "ok" } }] }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = createChatCompletion({ messages });
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(resultPromise).resolves.toMatchObject({ content: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("5xxが続くとhttp_errorを返す", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(response({}, 503));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = createChatCompletion({ messages });
    const rejection = expect(resultPromise).rejects.toMatchObject({
      code: "http_error",
      status: 503,
    });
    await vi.advanceTimersByTimeAsync(1_000);

    await rejection;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("通信エラーをnetworkへ変換する", async () => {
    process.env.AI_TIMEOUT_MS = "500";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(createChatCompletion({ messages })).rejects.toMatchObject({
      code: "network",
    });
  });

  it("choicesがない応答を拒否する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ model: "x" })));

    await expect(createChatCompletion({ messages })).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it("設定が足りない場合はnot_configuredを返す", async () => {
    delete process.env.AI_API_KEY;

    expect(getAiConfig()).toEqual({ kind: "none" });
    await expect(createChatCompletion({ messages })).rejects.toMatchObject({
      code: "not_configured",
    });
  });

  it("偽のAIは通信せず固定利用量と生成結果を返す", async () => {
    process.env.AI_API_BASE_URL = "fake";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createChatCompletion({ messages, fakeResponse: () => '{"fake":true}' }),
    ).resolves.toMatchObject({
      content: '{"fake":true}',
      model: "fake",
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("偽のAIに応答関数がなければinvalid_responseを返す", async () => {
    process.env.AI_API_BASE_URL = "fake";

    await expect(createChatCompletion({ messages })).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it("通信エラーにAPIキーを含めない", async () => {
    process.env.AI_TIMEOUT_MS = "500";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("secret-api-key was rejected")),
    );

    const error = await createChatCompletion({ messages }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(AiClientError);
    expect(String(error)).not.toContain("secret-api-key");
  });
});
