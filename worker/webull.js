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
async function sha256HexUpper(str) {
  const d = await crypto.subtle.digest('SHA-256', enc.encode(str));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
async function hmacSha1B64(key, msg, hash = 'SHA-1') {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(msg));
  let bin = ''; new Uint8Array(sig).forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}
const isoNow = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

// Build the signature exactly as the spec describes. Exported so it can be checked against Webull's worked example.
export async function signature({ path, query = {}, bodyStr = null, appKey, secret, ts, nonce, host = WB_HOST, md5 = null, algo = 'HMAC-SHA1' }) {
  const p = { 'x-app-key': appKey, 'x-signature-algorithm': algo, 'x-signature-version': '1.0', 'x-signature-nonce': nonce, 'x-timestamp': ts, host };
  Object.keys(query).forEach((k) => { const v = String(query[k]); p[k] = p[k] != null ? p[k] + '&' + v : v; });
  const str1 = Object.keys(p).sort().map((k) => k + '=' + p[k]).join('&');
  let str3 = path + '&' + str1;
  const bodyHash = md5 || (bodyStr ? (algo === 'HMAC-SHA256' ? await sha256HexUpper(bodyStr) : await md5HexUpper(bodyStr)) : null);
  if (bodyHash) str3 += '&' + bodyHash;
  return hmacSha1B64(secret + '&', pyQuote(str3), algo === 'HMAC-SHA256' ? 'SHA-256' : 'SHA-1');
}

export class Webull {
  constructor(env) {
    this.env = env;
    // Accept small naming variations (WEBULL_APP_KEY / WEBULL_API_KEY / WEBULL_KEY, ..._SECRET), trimmed.
    const names = Object.keys(env || {}).filter((k) => /webull/i.test(k));
    const pick = (re) => { const k = names.find((n) => re.test(n.trim())); return k ? String(env[k]).trim() : null; };
    this.secret = pick(/secret/i);
    this.key = pick(/^\s*webull[_ ]*(app|api)?[_ ]*key\s*$/i) || pick(/key/i);
    this.names = names;
    this.host = (env && env.WEBULL_HOST) || WB_HOST; this.algo = (env && env.WEBULL_ALGO) || 'HMAC-SHA1';
  }
  get ready() { return !!(this.key && this.secret); }

  async raw(method, path, query = {}, body = null, token = null) {
    const q = {}; Object.keys(query).forEach((k) => { const v = query[k]; if (v !== undefined && v !== null && v !== '') q[k] = Array.isArray(v) ? v.join(',') : String(v); });
    const bodyStr = body == null ? null : JSON.stringify(body);
    const ts = isoNow(), nonce = crypto.randomUUID().replace(/-/g, '');
    const sig = await signature({ path, query: q, bodyStr, appKey: this.key, secret: this.secret, ts, nonce, host: this.host, algo: this.algo });
    const headers = { 'x-app-key': this.key, 'x-timestamp': ts, 'x-signature': sig, 'x-signature-algorithm': this.algo, 'x-signature-version': '1.0', 'x-signature-nonce': nonce, 'x-version': 'v3', accept: 'application/json' };
    if (bodyStr != null) headers['content-type'] = 'application/json';
    if (token) headers['x-access-token'] = token;
    const qs = Object.keys(q).length ? '?' + Object.keys(q).map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(q[k])).join('&') : '';
    const r = await fetch('https://' + this.host + path + qs, { method, headers, body: bodyStr == null ? undefined : bodyStr });
    const text = await r.text(); let data = null; try { data = JSON.parse(text); } catch (e) { data = text; }
    return { status: r.status, data };
  }
}
