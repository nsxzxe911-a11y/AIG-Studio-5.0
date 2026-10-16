#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
POINTER=ROOT/'docs/evidence/aig-3d-authority-site-source.json'
EXPECTED_REPO='nsxzxe911-a11y/AIG-II'
EXPECTED_SCHEMA='aig-3d-authority-site-v1'
EXPECTED_PATH='web/authority-compare'

def main():
    if not POINTER.is_file(): raise AssertionError('missing AIG 3D authority site pointer')
    d=json.loads(POINTER.read_text(encoding='utf-8'))
    assert d['canonicalRepository']==EXPECTED_REPO
    assert d['schemaId']==EXPECTED_SCHEMA
    assert d['sitePath']==EXPECTED_PATH
    assert d['supportedAxes']==['3AX'], d['supportedAxes']
    assert len(d['lastVerifiedCommitSha'])==40
    assert not (ROOT/'web/authority-compare').exists(), 'AIG must not duplicate canonical comparison site source'
    print('AIG_3D_AUTHORITY_SITE_POINTER_PASS')
if __name__=='__main__': main()
