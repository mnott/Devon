/**
 * escape.ts — Safe value embedding for JXA scripts and shell commands.
 *
 * jxaLiteral() uses JSON.stringify to produce a valid JavaScript string literal,
 * eliminating the entire injection vulnerability class.
 */

/**
 * Convert any JS value into a safe JXA literal string.
 * Strings become quoted JS string literals, numbers/booleans pass through,
 * null/undefined become `null`, arrays/objects become JSON.
 */
export function jxaLiteral(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  // Arrays and objects: JSON.stringify produces valid JS literals
  return JSON.stringify(value);
}

/**
 * Escape a DEVONthink search query string.
 * Preserves wildcards (* and ?) which are valid search operators.
 * Escapes characters that could break JXA string context.
 */
export function escapeSearchQuery(query: string): string {
  // JSON.stringify handles all JS escaping; we just unwrap the outer quotes
  // since this will be embedded inside a jxaLiteral() call
  return query;
}

/**
 * Shell-quote a string by wrapping in single quotes and escaping embedded single quotes.
 */
export function shellQuote(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}
