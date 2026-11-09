/* Webull OpenAPI client for the jumptrade server.
   Signing follows Webull's spec (developer.webull.com → Authentication → Signature) and their official SDK:
   sorted query params + signing headers + host, joined path&k=v&...&MD5(body), URL-encoded, HMAC-SHA1 with secret + '&', base64.
   Keys come from Cloudflare secrets WEBULL_APP_KEY / WEBULL_APP_SECRET and never leave the server. */

export const WB_HOST = 'api.webull.com';
const enc = new TextEncoder();

// Python's urllib.parse.quote(s, safe='') — encodes everything except A-Z a-z 0-9 _ . - ~
export function pyQuote(s) {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}
async function md5HexUpper(str) {
  const d = await crypto.subtle.digest('MD5', enc.encode(str));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
async function hmacSha1B64(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(msg));
  let bin = ''; new Uint8Array(sig).forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}
const isoNow = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

// Build the signature exactly as the spec describes. Exported so it can be checked against Webull's worked example.
export async function signature({ path, query = {}, bodyStr = null, appKey, secret, ts, nonce, host = WB_HOST, md5 = null }) {
  const p = { 'x-app-key': appKey, 'x-signature-algorithm': 'HMAC-SHA1', 'x-signature-version': '1.0', 'x-signature-nonce': nonce, 'x-timestamp': ts, host };
  Object.keys(query).forEach((k) => { const v = String(query[k]); p[k] = p[k] != null ? p[k] + '&' + v : v; });
  const str1 = Object.keys(p).sort().map((k) => k + '=' + p[k]).join('&');
  let str3 = path + '&' + str1;
  const bodyHash = md5 || (bodyStr ? await md5HexUpper(bodyStr) : null);
  if (bodyHash) str3 += '&' + bodyHash;
  return hmacSha1B64(secret + '&', pyQuote(str3));
}

export class Webull {
  constructor(env) { this.env = env; this.key = env.WEBULL_APP_KEY; this.secret = env.WEBULL_APP_SECRET; }
  get ready() { return !!(this.key && this.secret); }

  async raw(method, path, query = {}, body = null, token = null) {
    const q = {}; Object.keys(query).forEach((k) => { const v = query[k]; if (v !== undefined && v !== null && v !== '') q[k] = Array.isArray(v) ? v.join(',') : String(v); });
    const bodyStr = body == null ? null : JSON.stringify(body);
    const ts = isoNow(), nonce = crypto.randomUUID().replace(/-/g, '');
    const sig = await signature({ path, query: q, bodyStr, appKey: this.key, secret: this.secret, ts, nonce });
    const headers = { 'x-app-key': this.key, 'x-timestamp': ts, 'x-signature': sig, 'x-signature-algorithm': 'HMAC-SHA1', 'x-signature-version': '1.0', 'x-signature-nonce': nonce, 'x-version': 'v3', accept: 'application/json' };
    if (bodyStr != null) headers['content-type'] = 'application/json';
    if (token) headers['x-access-token'] = token;
    const qs = Object.keys(q).length ? '?' + Object.keys(q).map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(q[k])).join('&') : '';
    const r = await fetch('https://' + WB_HOST + path + qs, { method, headers, body: bodyStr == null ? undefined : bodyStr });
    const text = await r.text(); let data = null; try { data = JSON.parse(text); } catch (e) { data = text; }
    return { status: r.status, data };
  }
}
