// Shared HTML escaping for emails. Split out so the theme module can use it
// without a circular import with mails.js.

// Decode entities once, then escape, so a feed title like "Nvidia&#x2019;s"
// renders as a real apostrophe instead of the literal entity.
export function decodeEntities(s) {
  return String(s == null ? '' : s)
    .replace(/&nbsp;/gi, '\u00A0')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#0?39;/gi, "'")
    .replace(/&rsquo;/gi, '\u2019')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const n = parseInt(h, 16);
      return n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : _;
    })
    .replace(/&#(\d+);/g, (_, d) => {
      const n = +d;
      return n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : _;
    })
    .replace(/&amp;/gi, '&');
}

export const E = (s) => decodeEntities(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// stop phone mail apps from turning times and dates into blue links
export const ND = (s) => E(s).replace(/(\d{1,2}):(\d{2})\s?(AM|PM|a\.m\.|p\.m\.)/gi, '$1:&#8288;$2&nbsp;$3').replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{1,2})\b/g, '$1&nbsp;$2');
