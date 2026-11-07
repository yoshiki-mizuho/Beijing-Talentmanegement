import { describe, expect, it } from "vitest";

import { getRequestHost, isCrossOriginWrite } from "./same-origin";

const defaultInput = {
  method: "POST",
  pathname: "/api/employees",
  origin: "https://example.com",
  host: "example.com"
};

describe("isCrossOriginWrite", () => {
  it("allows a same-origin POST", () => {
    expect(isCrossOriginWrite(defaultInput)).toBe(false);
  });

  it.each(["POST", "DELETE", "PATCH", "PUT"])(
    "rejects a cross-origin %s",
    (method) => {
      expect(
        isCrossOriginWrite({
          ...defaultInput,
          method,
          origin: "https://attacker.example"
        })
      ).toBe(true);
    }
  );

  it("allows GET", () => {
    expect(
      isCrossOriginWrite({ ...defaultInput, method: "GET", origin: "null" })
    ).toBe(false);
  });

  it("allows a request without Origin", () => {
    expect(isCrossOriginWrite({ ...defaultInput, origin: null })).toBe(false);
  });

  it("rejects a null Origin", () => {
    expect(isCrossOriginWrite({ ...defaultInput, origin: "null" })).toBe(true);
  });

  it("rejects an invalid Origin URL", () => {
    expect(isCrossOriginWrite({ ...defaultInput, origin: "invalid" })).toBe(true);
  });

  it("allows next-auth API requests", () => {
    expect(
      isCrossOriginWrite({
        ...defaultInput,
        pathname: "/api/auth/signout",
        origin: "https://attacker.example"
      })
    ).toBe(false);
  });

  it("allows the supplied forwarded host", () => {
    expect(
      isCrossOriginWrite({
        ...defaultInput,
        origin: "https://public.example.com",
        host: "public.example.com"
      })
    ).toBe(false);
  });

  it("rejects an origin with a different port", () => {
    expect(
      isCrossOriginWrite({
        ...defaultInput,
        origin: "https://example.com:8443"
      })
    ).toBe(true);
  });

  it("ignores POST requests outside the API", () => {
    expect(
      isCrossOriginWrite({
        ...defaultInput,
        pathname: "/employees",
        origin: "https://attacker.example"
      })
    ).toBe(false);
  });
});

describe("getRequestHost", () => {
  it("prefers the first forwarded host", () => {
    expect(
      getRequestHost("public.example.com, proxy.internal", "app.internal")
    ).toBe("public.example.com");
  });

  it("uses Host when a forwarded host is absent", () => {
    expect(getRequestHost(null, "example.com")).toBe("example.com");
  });
});
