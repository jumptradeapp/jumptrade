#!/usr/bin/env python3
"""Refresh web/funds.json from SEC EDGAR 13F-HR filings.

Runs on GitHub Actions (see .github/workflows/13f.yml). For each fund it finds the
latest 13F-HR, and if it is newer than what funds.json has, it rebuilds the top
holdings, the quarter-over-quarter changes (new / added / reduced / unchanged) and
the exits by comparing share counts with the previous quarter's filing.
"""
import json, re, sys, time, datetime, urllib.request, urllib.parse, urllib.error, xml.etree.ElementTree as ET, gzip, io, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUNDS = os.path.join(ROOT, 'web', 'funds.json')
CACHE = os.path.join(ROOT, 'tools', 'cusip_tickers.json')
UA = {'User-Agent': 'JumpTrade admin@survyr.ai', 'Accept-Encoding': 'gzip'}
FORCE = '--force' in sys.argv
ONLY = [a.split('=', 1)[1] for a in sys.argv if a.startswith('--only=')]
# CIKs for funds whose funds.json sources don't name the manager page
CIK_FIX = {'third-point': 1040273, 'greenlight-capital': 1079114, 'tiger-global-management': 1167483, 'coatue-management': 1135730,
           'viking-global-investors': 1103804, 'lone-pine-capital': 1061165, 'tci-fund-management': 1647251, 'srs-investment-management': 1503174,
           'egerton-capital': 1581811, 'abrams-capital': 1358706, 'cantillon-capital': 1279936, 'eminence-capital': 1107310}
# funds that file under a different entity name today; looked up on EDGAR by name
CIK_NAME = {'greenlight-capital': 'DME Capital Management'}
NAMES = json.load(open(os.path.join(ROOT, 'tools', 'fund_names.json'))) if os.path.exists(os.path.join(ROOT, 'tools', 'fund_names.json')) else {'names': {}, 'byname': {}}

def cik_by_name(name):
    raw = get('https://www.sec.gov/cgi-bin/browse-edgar?company=%s&type=13F-HR&dateb=&owner=include&count=40&action=getcompany&output=atom' % urllib.parse.quote(name), js=False).decode('utf-8', 'replace')
    m = re.search(r'<cik>0*(\d+)</cik>', raw) or re.search(r'CIK=0*(\d+)', raw)
    return int(m.group(1)) if m else None

_last = [0.0]
def get(url, js=True, tries=3):
    for k in range(tries):
        dt = time.time() - _last[0]
        if dt < 0.15: time.sleep(0.15 - dt)
        _last[0] = time.time()
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                b = r.read()
                if r.headers.get('Content-Encoding') == 'gzip': b = gzip.decompress(b)
            return json.loads(b) if js else b
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and k < tries - 1: time.sleep(3 * (k + 1)); continue
            raise
        except Exception:
            if k < tries - 1: time.sleep(2); continue
            raise

def qlabel(d):  # '2026-09-30' -> 'Q3 2026'
    y, m = int(d[:4]), int(d[5:7]); return 'Q%d %d' % ((m - 1) // 3 + 1, y)

def filings(cik):
    j = get('https://data.sec.gov/submissions/CIK%010d.json' % cik)
    rc = j['filings']['recent']; out = []
    for i, f in enumerate(rc['form']):
        if f in ('13F-HR', '13F-HR/A'):
            out.append({'form': f, 'acc': rc['accessionNumber'][i], 'filed': rc['filingDate'][i], 'period': rc['reportDate'][i]})
    return j.get('name', ''), out

def pick(fl):
    """Latest original 13F-HR per period, newest first (amendments only if no original)."""
    by = {}
    for f in fl:
        p = f['period']
        if p not in by or (by[p]['form'] != '13F-HR' and f['form'] == '13F-HR'): by[p] = f
    return [by[p] for p in sorted(by, reverse=True)]

def infotable(cik, acc):
    base = 'https://www.sec.gov/Archives/edgar/data/%d/%s/' % (cik, acc.replace('-', ''))
    idx = get(base + 'index.json')
    xs = [it for it in idx['directory']['item'] if it['name'].lower().endswith('.xml') and it['name'].lower() != 'primary_doc.xml']
    if not xs: raise RuntimeError('no info table in ' + acc)
    xs.sort(key=lambda it: (('info' not in it['name'].lower()), -int(it.get('size') or 0)))
    raw = get(base + xs[0]['name'], js=False)
    rows = {}
    for _, el in ET.iterparse(io.BytesIO(raw)):
        if el.tag.split('}')[-1] != 'infoTable': continue
        d = {c.tag.split('}')[-1]: c for c in el.iter()}
        def t(k):
            e = d.get(k); return (e.text or '').strip() if e is not None and e.text else ''
        if t('putCall'): el.clear(); continue  # options aren't holdings
        cu = t('cusip').upper()
        try: v = float(t('value') or 0); sh = float(t('sshPrnamt') or 0)
        except ValueError: el.clear(); continue
        r = rows.setdefault(cu, {'name': t('nameOfIssuer'), 'cls': t('titleOfClass'), 'v': 0.0, 'sh': 0.0})
        r['v'] += v; r['sh'] += sh
        el.clear()
    return rows, base

SUFFIX = re.compile(r'\b(INC|CORP|CORPORATION|CO|COMPANY|LTD|LIMITED|PLC|LLC|LP|L P|N V|NV|SA|S A|AG|SE|HOLDINGS?|GROUP|THE|CLASS|CL|COM|NEW|DEL|ADR|ADS|SPONSORED|ORD|SHS)\b')
def norm(s): return re.sub(r'\s+', ' ', SUFFIX.sub(' ', re.sub(r'[^A-Z0-9 ]', ' ', s.upper()))).strip()

def nicename(name, cls):
    keep = {'ETF', 'ADR', 'REIT', 'II', 'III', 'IV', 'LP', 'PLC', 'NV', 'SA', 'AG', 'SE', 'SPDR', 'USA', 'US', 'AI', 'TR', 'LLC', 'ASML', 'IBM', 'AMD', 'UBS', 'HSBC'}
    def w(x):
        if x in keep or '&' in x or (len(x) <= 3 and x.isalpha() and not any(v in x for v in 'AEIOU')): return x
        return x.capitalize()
    n = ' '.join(w(x) for x in name.split()).strip()
    m = re.search(r'\bCL(?:ASS)?\s*([A-C])\b', cls.upper())
    return n + (' (Class %s)' % m.group(1) if m else '')

def map_tickers(cus, rows, cache, sec_titles):
    need = [c for c in cus if c not in cache]
    for k in range(0, len(need), 10):  # OpenFIGI: no key = small batches
        batch = need[k:k + 10]
        body = json.dumps([{'idType': 'ID_CUSIP', 'idValue': c, 'exchCode': 'US'} for c in batch]).encode()
        try:
            req = urllib.request.Request('https://api.openfigi.com/v3/mapping', data=body, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=30) as r: res = json.loads(r.read())
            for c, x in zip(batch, res):
                d = (x.get('data') or [{}])[0]; tk = d.get('ticker')
                if tk: cache[c] = tk.replace('/', '.')
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(60); continue
        except Exception: pass
        time.sleep(2.6)
    for c in cus:  # fallback: match the issuer name to SEC's ticker list
        if c in cache: continue
        n = norm(rows[c]['name'])
        if n in NAMES['byname']: cache[c] = NAMES['byname'][n]
        elif n in sec_titles: cache[c] = sec_titles[n]

TK2T = {}
def label(tk, r):
    m = re.search(r'\bCL(?:ASS)?\s*([A-C])\b', r['cls'].upper())
    if tk and tk in NAMES['names']: return NAMES['names'][tk] + (' (Class %s)' % m.group(1) if m and '(Class' not in NAMES['names'][tk] else '')
    t = TK2T.get(tk) if tk else None
    if t:
        t = re.sub(r'\s*/[A-Z]{2,3}/?\s*$', '', t).strip()
        if t.isupper(): t = nicename(t, '')
        return t + (' (Class %s)' % m.group(1) if m and '(Class' not in t else '')
    return nicename(r['name'], r['cls'])

def build(f, cur, prev, meta, cache, sec_titles):
    tot = sum(r['v'] for r in cur.values()) or 1; ptot = sum(r['v'] for r in prev.values()) or 1
    top = sorted(cur, key=lambda c: -cur[c]['v'])[:25]
    exits = sorted([c for c in prev if c not in cur], key=lambda c: -prev[c]['v'])[:15]
    allr = dict(prev); allr.update(cur)
    map_tickers(top + exits, allr, cache, sec_titles)
    h = []
    for c in top:
        r = cur[c]; p = prev.get(c)
        if not p or p['sh'] <= 0: act, ch = 'new', 0.0
        else:
            ch = (r['sh'] - p['sh']) / p['sh'] * 100
            act = 'added' if ch > 0.5 else 'reduced' if ch < -0.5 else 'unchanged'
            if act == 'unchanged': ch = 0.0
        h.append([cache.get(c) or '', label(cache.get(c), r), round(r['v'] / tot * 100, 2), act, round(ch, 1)])
    x = [[cache.get(c) or '', label(cache.get(c), prev[c]), round(prev[c]['v'] / ptot * 100, 2)] for c in exits]
    g = dict(f)
    g.update({'period': qlabel(meta['period']), 'filed': meta['filed'], 'total': round(tot), 'n': len(cur), 'h': h, 'x': x,
              'acc': meta['acc'], 'auto': True,
              'notes': 'Auto-updated from SEC EDGAR: %s 13F-HR filed %s, compared with the %s filing by share count. Options (puts/calls) excluded. pct = share of reported 13F value.' % (qlabel(meta['period']), meta['filed'], meta.get('pp', 'previous'))})
    g['src'] = [meta['url']]
    return g

def main():
    data = json.load(open(FUNDS))
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    st = get('https://www.sec.gov/files/company_tickers.json')
    sec_titles = {}
    for v in st.values():
        sec_titles.setdefault(norm(v['title']), v['ticker'])
        TK2T.setdefault(v['ticker'].replace('-', '.'), v['title'].rstrip('.'))
    changed = []; problems = []
    for i, f in enumerate(data['funds']):
        if ONLY and f['slug'] not in ONLY: continue
        cik = CIK_FIX.get(f['slug']) or f.get('cik')
        if f['slug'] in CIK_NAME:
            try: cik = cik_by_name(CIK_NAME[f['slug']]) or cik
            except Exception as e: problems.append('%s: name lookup failed %s' % (f['slug'], e))
        if not cik:
            m = next((re.search(r'manager/0*(\d+)', u) for u in f.get('src', []) if 'manager/' in u), None)
            cik = int(m.group(1)) if m else None
        if not cik: problems.append(f['slug'] + ': no CIK'); continue
        try:
            name, fl = filings(int(cik)); ps = pick(fl)
            if not ps: problems.append(f['slug'] + ': no 13F-HR'); continue
            last = ps[0]
            qn = lambda q: (lambda m: int(m.group(2)) * 4 + int(m.group(1)) if m else 0)(re.match(r'Q(\d) (\d{4})', q or ''))
            if qn(qlabel(last['period'])) < qn(f.get('period')):
                problems.append('%s: EDGAR latest is %s, older than the %s already shown - kept (check the CIK %s)' % (f['slug'], qlabel(last['period']), f.get('period'), cik)); continue
            if not FORCE and f.get('acc') == last['acc']: continue
            if not FORCE and qlabel(last['period']) == f.get('period') and last['filed'] <= f.get('filed', ''): 
                f['cik'] = int(cik); continue
            cur, base = infotable(int(cik), last['acc'])
            prev = {}; pp = 'previous'
            if len(ps) > 1:
                prev, _ = infotable(int(cik), ps[1]['acc']); pp = qlabel(ps[1]['period'])
            meta = dict(last, pp=pp, url=base)
            g = build(f, cur, prev, meta, cache, sec_titles); g['cik'] = int(cik)
            data['funds'][i] = g
            changed.append('%s %s (%s, %d lines)' % (f['slug'], g['period'], name, g['n']))
            print('updated', changed[-1], flush=True)
        except Exception as e:
            problems.append('%s: %s' % (f['slug'], e)); print('problem', problems[-1], flush=True)
    data['updated'] = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%MZ')
    if changed or FORCE:
        json.dump(data, open(FUNDS, 'w'), separators=(',', ':'))
    else:
        # still record the CIKs we learned, without rewriting holdings
        json.dump(data, open(FUNDS, 'w'), separators=(',', ':'))
    json.dump(cache, open(CACHE, 'w'), indent=0, sort_keys=True)
    print('changed:', len(changed)); print('\n'.join(changed))
    if problems: print('problems:\n' + '\n'.join(problems))

if __name__ == '__main__':
    main()
