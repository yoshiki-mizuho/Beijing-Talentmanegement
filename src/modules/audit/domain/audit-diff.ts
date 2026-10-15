type AuditObject = Record<string, unknown>;

function normalize(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalize(item)]),
    );
  }
  return value;
}

export function diffForAudit(
  before: AuditObject,
  after: AuditObject,
  options?: { redactedFields?: readonly string[] },
) {
  const redacted = new Set(options?.redactedFields ?? []);
  const changedFields: string[] = [];
  const beforeDiff: AuditObject = {};
  const afterDiff: AuditObject = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const oldValue = normalize(before[key]);
    const newValue = normalize(after[key]);
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
    changedFields.push(key);
    if (!redacted.has(key)) {
      beforeDiff[key] = oldValue;
      afterDiff[key] = newValue;
    }
  }
  return changedFields.length === 0
    ? null
    : { before: beforeDiff, after: afterDiff, changedFields };
}
