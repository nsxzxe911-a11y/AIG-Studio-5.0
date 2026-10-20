#!/usr/bin/env python3
"""Prepare synthetic source spec for GitHub: ALWAYS mark not approved, no private reference PNG."""
import argparse,hashlib,json
from pathlib import Path

def main():
 p=argparse.ArgumentParser()
 p.add_argument('--synthetic-png',required=True)
 p.add_argument('--hair-spec',required=True)
 p.add_argument('--out',required=True)
 a=p.parse_args()
 doc=json.loads(Path(a.hair_spec).read_text(encoding='utf8'))
 if doc['approved3DModel'] or doc['releasedToHomepage']:raise ValueError('incorrect release status')
 doc['source']['sha256']=hashlib.sha256(Path(a.synthetic_png).read_bytes()).hexdigest()
 doc['gate']['ciSyntheticFixtureOnly']=True
 doc['gate']['realApprovedImageNotPresentInRunner']=True
 doc['gate']['aiModelAvailable']=False
 Path(a.out).parent.mkdir(parents=True,exist_ok=True)
 Path(a.out).write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print('synthetic sha:',doc['source']['sha256'],'not approved, 88 guides')
if __name__=='__main__':main()