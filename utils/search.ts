// ============================================================================
// Search snippets. ts_headline wraps matches in <b>…</b>; everything else in the
// fragment is plain text that may still contain stray markup, so it is rendered
// as text (never as HTML) after dropping every other tag.
// ============================================================================

export type SnippetPart = { text: string; bold: boolean };

export function parseSnippet(snippet: string): SnippetPart[] {
  const parts: SnippetPart[] = [];
  for (const piece of snippet.split(/(<\/?b>)/gi)) {
    if (/^<b>$/i.test(piece)) parts.push({ text: "", bold: true });
    else if (/^<\/b>$/i.test(piece)) continue;
    else {
      const text = piece.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      if (!text) continue;
      const last = parts[parts.length - 1];
      // Text right after an opening <b> is the match; anything else is plain.
      if (last && last.bold && last.text === "") last.text = text;
      else parts.push({ text, bold: false });
    }
  }
  return parts.filter((p) => p.text !== "");
}

/** "CRM_LEAD" → "Crm lead" (a readable fallback for entity types that have no translation). */
export function humanizeEntityType(type: string): string {
  const words = type.toLowerCase().split(/[_\s]+/).filter(Boolean).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
