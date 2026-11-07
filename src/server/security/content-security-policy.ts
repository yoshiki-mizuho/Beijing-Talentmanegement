export function buildContentSecurityPolicy(
  nonce: string,
  nodeEnv: string | undefined = process.env.NODE_ENV
) {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      nodeEnv === "development" ? " 'unsafe-eval'" : ""
    }`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'"
  ];

  if (nodeEnv === "production") {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}
