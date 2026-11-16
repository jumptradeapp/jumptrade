# Builds the private (Claude) copy of the new design from the repo's web/v2. Re-run after every v2 change.
import os,re,shutil
SRC='/home/claude/jumptrade/web'; DST='/home/claude/live'
if not os.path.exists(DST+'/classic.html'): shutil.copy(DST+'/index.html',DST+'/classic.html')
os.makedirs(DST+'/v2/img',exist_ok=True)
for f in ['v2.css','patterns.json']: shutil.copy(SRC+'/v2/'+f,DST+'/v2/'+f)
for f in os.listdir(SRC+'/v2/img'): shutil.copy(SRC+'/v2/img/'+f,DST+'/v2/img/'+f)
shutil.copy('/tmp/priv/priv.js',DST+'/v2/priv.js')
def fix(s):
    s=s.replace('"/v2/','"v2/').replace("'/v2/","'v2/").replace("'/lg/","'lg/").replace('/classic.html#','classic.html#')
    return s
v=fix(open(SRC+'/v2/v2.js').read())
v=v.replace("const call = (tool, input) => Promise.race(","const call = (tool, input) => (window.privTool && window.privTool(tool, input)) || Promise.race(",1)
v=v.replace("let REAL = false; window.V2REAL = () => REAL;","let REAL = false; window.V2REAL = () => REAL; window.V2SETREAL = (x) => { REAL = !!x; };",1)
v=v.replace("setupOf, loadSetup, SETUP, sp, sparks,","setupOf, loadSetup, SETUP, sp, sparks, bars,",1)
i=v.index('  function tl(sym, s) {'); j=v.index('\n',i)
PATCH=r"""    if (window.privLogo) { if (sym === 'BULL') return '<span class="tl" style="width:' + s + 'px;height:' + s + 'px"><img src="v2/img/webull.png" alt="Webull" style="width:' + Math.round(s * 0.7) + 'px;height:' + Math.round(s * 0.7) + 'px"></span>'; const d = privLogo(sym); return '<span class="tl' + (d && !d.dark ? ' wt' : '') + '" data-s="' + E(sym) + '" style="width:' + s + 'px;height:' + s + 'px">' + (d ? '<img alt="" src="' + d.u + '" style="width:' + Math.round(s * 0.7) + 'px;height:' + Math.round(s * 0.7) + 'px">' : '<span class="mono2" style="font-size:' + Math.round(s * 0.34) + 'px">' + E(sym.slice(0, 2)) + '</span>') + '</span>'; }
"""
v=v[:j+1]+PATCH+v[j+1:]
assert 'privTool' in v and 'V2SETREAL' in v and 'privLogo' in v
open(DST+'/v2/v2.js','w').write(v)
open(DST+'/v2/v2x.js','w').write(fix(open(SRC+'/v2/v2x.js').read()))
h=open(SRC+'/index.html').read()
h=fix(h).replace('href="/manifest.webmanifest?v=2"','href="manifest.webmanifest"').replace('href="/apple-touch-icon.png','href="apple-touch-icon.png')
h=re.sub(r'<script src="/shim\.js[^"]*"></script>','',h); h=re.sub(r'<script src="/auth\.js[^"]*"></script>','',h)
h=re.sub(r'<script src="/devsync\.js[^"]*"></script>','',h); h=re.sub(r'<script src="/alerts\.js[^"]*"></script>','',h)
h=h.replace('src="/nthumb.js','src="nthumb.js').replace('src="/dip.js','src="dip.js').replace('src="/val.js','src="val.js')
h=h.replace('<title>jumptrade.</title>','<title>jumptrade. live</title>')
h=h.replace('<script src="v2/v2x.js','<script src="v2/priv.js?v=1"></script><script src="v2/v2x.js',1)
open(DST+'/index.html','w').write(h)
print('built'); print(h[h.index('<script'):][:900])
