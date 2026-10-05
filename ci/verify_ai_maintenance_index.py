#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
AGENTS=ROOT/'AGENTS.md'
GUIDE=ROOT/'docs/ai/AI_MAINTENANCE_QUICK_GUIDE.md'
REQUIRED_CATEGORIES=[
 'STARTUP_HOME','RGB_ASSET','CAD','CAM','SIM','AXIS_3_6','NC_FANUC_POST',
 'ANDROID_WINDOWS','SETTINGS','RUNTIME_LINK','SYNC_UPDATE','FULL_OPEN_POLICY',
 'EXACT_BIND','TUTORIAL_PACK','BREAKPOINT_RECOVERY'
]

def fail(code:str)->None:
    print('AI_MAINTENANCE_INDEX_FAIL|'+code)
    raise SystemExit(1)

def read(path:Path)->str:
    if not path.is_file(): fail('MISSING|'+path.relative_to(ROOT).as_posix())
    return path.read_text(encoding='utf-8')

def main()->None:
    agents=read(AGENTS)
    guide=read(GUIDE)
    if 'Read AGENTS.md first' not in agents:
        fail('ROOT_FIRST_RULE')
    if 'do not begin by scanning entire multi-thousand-line MainActivity/DesktopApp files' not in agents:
        fail('NO_WHOLE_FILE_SCAN_RULE')
    if 'docs/ai/AI_MAINTENANCE_QUICK_GUIDE.md' not in agents:
        fail('GUIDE_LINK')
    for category in REQUIRED_CATEGORIES:
        if f'[{category}]' not in guide:
            fail('CATEGORY|'+category)
    # Representative lookup rows must be actionable, not label-only documentation.
    rows=[]
    for line in guide.splitlines():
        if line.startswith('| ') and line.count('|')>=5 and '`' in line:
            rows.append(line)
    if len(rows)<10:
        fail('LOOKUP_ROWS|'+str(len(rows)))
    representatives=['HOME 不見','RGB 圖不對','CAM 刀路問題','6AX 問題','NC / Fanuc 問題','版本 exact-bind','AI 斷線續接']
    for symptom in representatives:
        found=[r for r in rows if symptom in r]
        if not found:
            fail('LOOKUP_MISSING|'+symptom)
        row=found[0]
        cells=[c.strip() for c in row.strip('|').split('|')]
        if len(cells)<4 or any(not x for x in cells[:4]):
            fail('LOOKUP_INCOMPLETE|'+symptom)
    if len(agents.splitlines())>120:
        fail('AGENTS_TOO_LONG')
    print(f'AI_MAINTENANCE_INDEX_PASS|CATEGORIES={len(REQUIRED_CATEGORIES)}|LOOKUPS={len(rows)}|ROOT_LINES={len(agents.splitlines())}')

if __name__=='__main__': main()
