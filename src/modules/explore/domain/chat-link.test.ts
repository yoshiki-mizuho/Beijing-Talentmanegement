import { describe, expect, it } from "vitest";

import { buildChatUrl } from "./chat-link";

describe("buildChatUrl", () => {
  it.each(["https", "msteams", "slack"])(
    "allows the %s protocol and encodes the email address",
    (protocol) => {
      expect(
        buildChatUrl(`${protocol}://chat.example.test/new?to={email}`, "user+tag@example.com")
      ).toContain("user%2Btag%40example.com");
    }
  );

  it.each([
    "http://chat.example.test/new?to={email}",
    "javascript:alert({email})",
    "not a URL {email}"
  ])("rejects an unsafe or invalid template", (template) => {
    expect(buildChatUrl(template, "user@example.com")).toBeNull();
  });

  it("rejects a template without an email placeholder", () => {
    expect(buildChatUrl("https://chat.example.test/new", "user@example.com")).toBeNull();
  });
});
