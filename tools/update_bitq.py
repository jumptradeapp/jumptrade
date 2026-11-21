#!/usr/bin/env python3
"""Refresh the Crypto sector (BITQ) holdings in web/v2/sectors.json from Bitwise's fund page.
Real holdings only: US-listed tickers kept; foreign lines map to their US listing when one exists, else dropped."""
import json, re, sys, urllib.request
URL = 'https://bitwiseinvestments.com/crypto-funds/bitq'
US = {'HUT CN': 'HUT', 'GLXY CN': 'GLXY', 'HIVE CN': 'HIVE'}  # same companies' Nasdaq listings
def main(path='web/v2/sectors.json'):
    h = urllib.request.urlopen(urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30).read().decode('utf8', 'replace').replace('\\"', '"')
    rows = re.findall(r'\{"name":"([^"]+)","marketValue":([\d.]+),"weight":([\d.eE-]+),"ticker":"([^"]*)","shares":(\d+)\}', h)
    seen = {}
    for n, mv, w, t, sh in rows:
        if t not in seen: seen[t] = (n, float(w))
    n_all = len(seen); top = []
    for t, (n, w) in sorted(seen.items(), key=lambda x: -x[1][1]):
        t = US.get(t, t)
        if ' ' in t or not re.fullmatch(r'[A-Z.]{1,6}', t): continue
        top.append({'s': t, 'n': n, 'w': round(w * 100, 2)})
    dates = sorted(set(re.findall(r'"asOf(?:Date)?":"(\d{4}-\d{2}-\d{2})"', h)))
    if len(top) < 10: sys.exit('too few BITQ holdings parsed: %d' % len(top))
    d = json.load(open(path))
    import datetime
    asof = datetime.date.fromisoformat(dates[-1]).strftime('As of %d-%b-%Y') if dates else ''
    d['sectors']['BITQ'] = {'name': 'Crypto', 'n': n_all, 'top': top, 'fund': 'Bitwise Crypto Industry Innovators ETF', 'source': 'Bitwise', 'asOf': asof}
    with open(path, 'w') as f: json.dump(d, f, separators=(',', ':'))  # same compact form as the SPDR writer
    print('BITQ', len(top), 'of', n_all, asof)
if __name__ == '__main__': main(*sys.argv[1:])
