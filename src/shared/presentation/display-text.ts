/** Display typography only. Stored values, form inputs, identifiers and URLs stay unchanged. */
export function displayText<T>(value: T): T extends string ? string : T;
export function displayText(value: unknown): unknown {
  if (typeof value !== "string" || !value.includes("\u2014")) return value;
  return value.trim() === "\u2014" ? "Not recorded" : value.replaceAll("\u2014", "·");
}
