from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
replit=(ROOT/'.replit')
pkg=(ROOT/'web/package.json')
index=(ROOT/'web/index.html')

assert replit.is_file(), "REPLIT_CONFIG_MISSING"
assert pkg.is_file(), "WEB_PACKAGE_MISSING"
data=json.loads(pkg.read_text(encoding='utf-8'))
assert data['scripts']['dev'].startswith('vite '), "VITE_DEV_SCRIPT_MISSING"
assert data['scripts']['build']=='vite build', "VITE_BUILD_SCRIPT_MISSING"

html=index.read_text(encoding='utf-8')
assert r'\n<script>\n' not in html, "LITERAL_ESCAPED_SCRIPT_NEWLINES"
assert r'\n<link rel=' not in html, "LITERAL_ESCAPED_HEAD_NEWLINES"
for needle in ('CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','cadCanvas','camCanvas','sim3dCanvas'):
    assert needle in html, f"RUNTIME_SURFACE_MISSING:{needle}"

cfg=replit.read_text(encoding='utf-8')
assert 'npm --prefix web run dev' in cfg, "REPLIT_RUN_NOT_WEB_RUNTIME"
print('REPLIT_WEB_RUNTIME_GATE_PASS|GITHUB_IMPORT|VITE|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|REAL_CANVAS|SCRIPT_CLEAN')
