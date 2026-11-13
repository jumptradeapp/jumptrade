import json, time, gzip, concurrent.futures as cf, requests, random, sys
syms=[s[0] for s in json.load(open('web/symbols.json'))]+['SPY','QQQ','IWM']
EXCH={s[0]:s[2] for s in json.load(open('web/symbols.json'))}
try:  # add OTC and any listed names missing above, so penny stocks down to $0.01 are included
    sec=requests.get('https://www.sec.gov/files/company_tickers_exchange.json',headers={'User-Agent':'jumptrade research bot@jumptrade.app'},timeout=30).json()
    f=sec['fields']; it=f.index('ticker'); ie=f.index('exchange')
    for row in sec['data']:
        t=str(row[it]).upper()
        if t and t not in EXCH: EXCH[t]=row[ie] or 'OTC'; syms.append(t)
    print('sec added', sum(1 for r in sec['data']), flush=True)
except Exception as e: print('sec list failed', e, flush=True)
syms=sorted(set(syms))
H={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'}
S=requests.Session(); S.headers.update(H)
def get(sym):
    y=sym.replace('.','-').replace('/','-')
    for host in ['query1','query2','query1','query2','query1']:
        try:
            r=S.get(f'https://{host}.finance.yahoo.com/v8/finance/chart/{y}',params={'range':'2y','interval':'1d','includePrePost':'false','events':'div,splits'},timeout=20)
            if r.status_code==404: return sym,None,'404'
            if r.status_code==429: time.sleep(3+random.random()*4); continue
            r.raise_for_status(); j=r.json()['chart']['result']
            if not j: return sym,None,'empty'
            j=j[0]; q=j['indicators']['quote'][0]; adj=j['indicators'].get('adjclose',[{}])[0].get('adjclose')
            return sym,{'t':j.get('timestamp',[]),'o':q.get('open'),'h':q.get('high'),'l':q.get('low'),'c':q.get('close'),'v':q.get('volume'),'a':adj,'meta':{k:j['meta'].get(k) for k in ('instrumentType','exchangeName','currency','longName')}},'ok'
        except Exception as e:
            time.sleep(1.5); err=str(e)[:80]
    return sym,None,'fail'
out={}; st={}
with cf.ThreadPoolExecutor(12) as ex:
    for i,(s,d,why) in enumerate(ex.map(get,syms)):
        st[why]=st.get(why,0)+1
        if d and d['t']: out[s]=d
        if i%500==0: print(i,st,flush=True)
print('final',st,len(out))
json.dump(out,gzip.open('bars.json.gz','wt')); json.dump(EXCH,open('exch.json','w'))
