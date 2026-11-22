import { describe, expect, it } from "vitest";

import { assertLlmInput, llmInputBytes, PlatformLlmError } from "./llm";

describe("platform LLM input", () => {
  it("UTF-8のバイト数を数える", () => {
    expect(llmInputBytes("あ", "a")).toBe(4);
  });

  it("合計24000バイトを超える入力を拒む", () => {
    expect(() => assertLlmInput("", "あ".repeat(8_001)))
      .toThrow(PlatformLlmError);
  });
});
