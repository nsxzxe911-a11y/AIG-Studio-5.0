#!/usr/bin/env python3
"""AIG original single-file Windows/Android HTML packer.
Makes offline HTML from in-repo JS and a user-owned, non-approved GLB.
Neither this packer nor the output constitutes 60fps evidence.
"""
from pathlib import Path
import argparse,base64,hashlib,re
ROOT=Path(__file__).resolve().parents[1]
def build(glb,out):
    raw=Path(glb).read_bytes()
    if raw[:4]!=b'glTF':raise ValueError('Expected glTF 2 binary asset')
    html=(ROOT/'web/index.html').read_text('utf8')
    data=(ROOT/'web/fastmodel-data.mjs').read_text('utf8').replace('export ','')
    render=(ROOT/'web/renderer.mjs').read_text('utf8').replace("import {decodeGLB,readAccessor,buildBatches} from './fastmodel-data.mjs';",'').replace('export ','')
    main=(ROOT/'web/main.mjs').read_text('utf8').replace("import {FastModelView} from './renderer.mjs';",'')
    old="let r=await fetch('../assets/phase17-visual-NOT-APPROVED.glb');"
    new="if(window.AIG_EMBEDDED_GLB){const bytes=Uint8Array.from(atob(window.AIG_EMBEDDED_GLB),c=>c.charCodeAt(0));await importGLB(bytes.buffer);return;}let r=await fetch('../assets/phase17-visual-NOT-APPROVED.glb');"
    if old not in main:raise ValueError('Page load contract changed')
    main=main.replace(old,new)
    encoded=base64.b64encode(raw).decode('ascii')
    payload='<script>\nwindow.AIG_EMBEDDED_GLB="'+encoded+'";\n'+data+'\n'+render+'\n'+main+'\n</script>'
    marker='<script type="module" src="./main.mjs"></script>'
    if html.count(marker)!=1:raise ValueError('Expected exactly one script tag')
    html=html.replace(marker,payload)
    out=Path(out);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(html,'utf8')
    print({'html':str(out),'bytes':out.stat().st_size,'sourceGLBSHA256':hashlib.sha256(raw).hexdigest(),'selfContained':True,'productionApproved':False})
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--glb',required=True);p.add_argument('--out',required=True);a=p.parse_args();build(a.glb,a.out)