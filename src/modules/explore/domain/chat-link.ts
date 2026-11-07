const allowedChatProtocols = new Set(["https:", "msteams:", "slack:"]);

export function buildChatUrl(template: string | undefined, email: string) {
  if (!template?.includes("{email}")) {
    return null;
  }

  try {
    const url = new URL(
      template.replaceAll("{email}", encodeURIComponent(email))
    );
    return allowedChatProtocols.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}
