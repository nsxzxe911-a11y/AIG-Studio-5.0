#!/usr/bin/env python3
"""CI artifact only: synthetic 1672x941 image replaces approved picture. NEVER visual authority."""
import argparse,hashlib,json,struct,zlib
from pathlib import Path
from build_envelope import build

def chunk(name,data):return struct.pack('>I',len(data))+name+data+struct.pack('>I',zlib.crc32(name+data)&0xffffffff)
def solid_fixture(w,h):
    data=b''.join(b'\0'+bytes((126,132,145))*w for _ in range(h))
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(data))+chunk(b'IEND',b'')

def main():
    p=argparse.ArgumentParser();p.add_argument('--outdir',required=True);args=p.parse_args()
    base=Path(args.outdir);base.mkdir(parents=True,exist_ok=True)
    root=Path(__file__).resolve().parent.parent
    spec=json.loads((root/'mesh-envelope.v1.json').read_text(encoding='utf8'))
    raw=solid_fixture(spec['source']['width'],spec['source']['height']);img=base/'CI-SYNTHETIC-NOT-AUTHORITY.png';img.write_bytes(raw)
    original=spec['source']['sha256'];spec['source']['sha256']=hashlib.sha256(raw).hexdigest()
    fixture=base/'CI-SYNTHETIC-SPEC.json';fixture.write_text(json.dumps(spec,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    glb=base/'CI-SYNTHETIC-MESH-NOT-VISUAL-AUTHORITY.glb'
    report=build(img,glb,fixture)
    report['syntheticFixtureNotApprovedPhoto']=True
    report['realAuthoritySHA256NotUsedInCI']=original
    (base/'CI-TECHNICAL-REPORT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':main()