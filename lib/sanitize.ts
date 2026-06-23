/**
 * lib/sanitize.ts — Server-side XSS sanitization for user-generated content.
 *
 * Uses a lightweight allowlist-based approach compatible with Next.js
 * server components (no DOM dependency required for server-side sanitization).
 * For client-side rich text rendering, DOMPurify is imported dynamically.
 */

// ─── Server-side sanitization (API routes + RSC) ──────────────────────────────

/** Strips all HTML tags. Safe for plain text fields (event name, etc.) */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')           // strip all tags
    .replace(/&[a-z]+;/gi, (entity) => { // decode common HTML entities
      const entities: Record<string, string> = {
        '&amp;': '&', '&lt;': '<', '&gt;': '>',
        '&quot;': '"', '&#39;': "'", '&nbsp;': ' ',
      };
      return entities[entity] ?? entity;
    })
    .trim()
    .slice(0, 10_000); // hard length cap
}

/** Strips dangerous HTML but allows safe formatting tags for descriptions. */
export function sanitizeHtml(input: string): string {
  const ALLOWED_TAGS = /^(p|br|b|i|em|strong|ul|ol|li|a|h[1-6])$/i;
  const DANGEROUS_ATTRS = /\bon\w+\s*=|javascript:|data:/i;

  return input
    // Remove script/style/iframe blocks entirely
    .replace(/<(script|style|iframe|object|embed|form|input|button)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed|form|input|button)[^>]*\/>/gi, '')
    // Remove dangerous attributes from remaining tags
    .replace(/<([a-z][a-z0-9]*)\s([^>]*)>/gi, (match, tag, attrs) => {
      if (!ALLOWED_TAGS.test(tag)) return '';
      if (DANGEROUS_ATTRS.test(attrs)) return `<${tag}>`;
      // Only allow href on <a> tags, strip all other attrs
      if (tag.toLowerCase() === 'a') {
        const hrefMatch = attrs.match(/href="([^"]+)"/);
        const href = hrefMatch ? hrefMatch[1] : '#';
        // Only allow http/https hrefs
        if (!/^https?:\/\//.test(href)) return `<a>`;
        return `<a href="${href}" rel="noopener noreferrer" target="_blank">`;
      }
      return `<${tag}>`;
    })
    .trim()
    .slice(0, 50_000);
}

/** Validate and sanitize a URL. Returns null if unsafe. */
export function sanitizeUrl(input: string): string | null {
  try {
    const url = new URL(input);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Sanitize event input object (used in POST /api/events) */
export interface RawEventInput {
  name: string;
  description: string;
  venue: string;
  [key: string]: unknown;
}

export function sanitizeEventInput(input: RawEventInput): RawEventInput {
  return {
    ...input,
    name: sanitizeText(input.name).slice(0, 120),
    description: sanitizeHtml(input.description).slice(0, 5_000),
    venue: sanitizeText(input.venue).slice(0, 200),
  };
}

// ─── Client-side DOMPurify wrapper (for rich content rendering) ───────────────

/** Call this in Client Components when rendering user HTML content. */
export async function sanitizeHtmlClient(dirty: string): Promise<string> {
  if (typeof window === 'undefined') return sanitizeHtml(dirty);
  const DOMPurify = (await import('dompurify')).default;
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'ul', 'ol', 'li', 'a', 'h2', 'h3'],
    ALLOWED_ATTR: ['href', 'rel', 'target'],
    ALLOW_DATA_ATTR: false,
  });
}
