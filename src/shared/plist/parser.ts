/**
 * parser.ts — Plist XML parsing utilities.
 *
 * Migrated from the original listSmartGroups.ts to be shared across tools.
 * Provides depth-aware extraction of top-level <dict> blocks and typed
 * value extractors for common plist types.
 */

/**
 * Extract top-level <dict>...</dict> blocks from an XML string, respecting nesting.
 * Returns the INNER content of each top-level dict (not including the <dict> tags).
 */
export function extractTopLevelDicts(xml: string): string[] {
  const results: string[] = [];
  let pos = 0;

  while (pos < xml.length) {
    const openIdx = xml.indexOf("<dict>", pos);
    if (openIdx === -1) break;

    let depth = 1;
    let cur = openIdx + 6;
    while (cur < xml.length && depth > 0) {
      const nextOpen = xml.indexOf("<dict>", cur);
      const nextClose = xml.indexOf("</dict>", cur);

      if (nextClose === -1) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        cur = nextOpen + 6;
      } else {
        depth--;
        if (depth === 0) {
          results.push(xml.slice(openIdx + 6, nextClose));
          pos = nextClose + 7;
          break;
        }
        cur = nextClose + 7;
      }
    }

    if (depth !== 0) break;
  }

  return results;
}

/** Escape special regex characters in a string. */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Extract <string> value after <key>keyName</key> */
export function extractStringAfterKey(content: string, keyName: string): string | null {
  const pattern = new RegExp(
    `<key>${escapeRegex(keyName)}</key>\\s*<string>([^<]*)<\\/string>`
  );
  const m = pattern.exec(content);
  return m ? m[1].trim() : null;
}

/** Extract <date> value after <key>keyName</key> */
export function extractDateAfterKey(content: string, keyName: string): string | null {
  const pattern = new RegExp(
    `<key>${escapeRegex(keyName)}</key>\\s*<date>([^<]*)<\\/date>`
  );
  const m = pattern.exec(content);
  return m ? m[1].trim() : null;
}

/** Extract <true/> or <false/> after <key>keyName</key> */
export function extractBoolAfterKey(content: string, keyName: string): boolean | null {
  const pattern = new RegExp(
    `<key>${escapeRegex(keyName)}</key>\\s*<(true|false)\\/>`
  );
  const m = pattern.exec(content);
  if (!m) return null;
  return m[1] === "true";
}

/** Extract <integer> value after <key>keyName</key> */
export function extractIntegerAfterKey(content: string, keyName: string): number | null {
  const pattern = new RegExp(
    `<key>${escapeRegex(keyName)}</key>\\s*<integer>([^<]*)<\\/integer>`
  );
  const m = pattern.exec(content);
  return m ? parseInt(m[1].trim(), 10) : null;
}

/** Extract <real> value after <key>keyName</key> */
export function extractRealAfterKey(content: string, keyName: string): number | null {
  const pattern = new RegExp(
    `<key>${escapeRegex(keyName)}</key>\\s*<real>([^<]*)<\\/real>`
  );
  const m = pattern.exec(content);
  return m ? parseFloat(m[1].trim()) : null;
}

/**
 * Extract the inner content of the <dict> block after <key>keyName</key>,
 * respecting nesting depth.
 */
export function extractSubDictAfterKey(content: string, keyName: string): string | null {
  const keyPattern = new RegExp(`<key>${escapeRegex(keyName)}</key>\\s*<dict>`);
  const keyMatch = keyPattern.exec(content);
  if (!keyMatch) return null;

  let depth = 1;
  let pos = keyMatch.index + keyMatch[0].length;
  const startPos = pos;

  while (pos < content.length && depth > 0) {
    const openIdx = content.indexOf("<dict>", pos);
    const closeIdx = content.indexOf("</dict>", pos);

    if (closeIdx === -1) break;

    if (openIdx !== -1 && openIdx < closeIdx) {
      depth++;
      pos = openIdx + 6;
    } else {
      depth--;
      if (depth === 0) {
        return content.slice(startPos, closeIdx);
      }
      pos = closeIdx + 7;
    }
  }

  return null;
}
