#!/usr/bin/env python3
"""AIG source-only handoff gate. Does not assert live Render or native runtime success."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
web = ROOT / 'web'
formal = ROOT / 'formal-web'
for filename in ('ai-resume.html', 'ai-resume-manifest.json'):
    assert (web / filename).read_bytes() == (formal / filename).read_bytes(), 'SITE_COPY_DRIFT: ' + filename
    assert (web / filename).stat().st_size > 0
for folder in (web, formal):
    html = (folder / 'ai-resume.html').read_text(encoding='utf-8')
    homepage = (folder / 'index.html').read_text(encoding='utf-8')
    assert 'href="./ai-resume.html"' in homepage, 'AI_LINK_MISSING'
    assert 'fetch(url,{cache:"no-store"})' in html, 'HANDOFF_FETCH_MISSING'
    assert 'textContent' in html and 'navigator.clipboard' in html, 'RESUME_CALLBACK_MISSING'
    assert 'SOURCE_CHECKPOINT_NOT_RUNTIME_PASS' in html, 'SOURCE_GATE_LABEL_MISSING'
    assert '<script>' in html and '</script>' in html
manifest = json.loads((formal / 'ai-resume-manifest.json').read_text(encoding='utf-8'))
assert manifest['schema'] == 'aig.ai-continuity.v1'
assert manifest['record_kind'] == 'SOURCE_CHECKPOINT_NOT_RUNTIME_PASS'
assert manifest['website']['deployment'] == 'NOT_VERIFIED_LIVE'
assert set(p['id'] for p in manifest['projects']) == {'AIG-II', 'AIG Studio 5.0', 'AIG FastModel'}
for project in manifest['projects']:
    assert project['runtime_gate'] == 'NOT_VERIFIED', 'RUNTIME_FALSE_SUCCESS'
    if project['source_checked']:
        assert re.fullmatch('[0-9a-f]{40}', project['source_sha']), 'MALFORMED_SOURCE_SHA'
    else:
        assert not project['source_sha'], 'FALSE_SOURCE_CHECK'
assert manifest['checks']['native_artifacts'] == 'NOT_VERIFIED'
assert manifest['checks']['all_runtime_functions'] == 'NOT_VERIFIED'
assert 'last_action' in manifest and 'next_steps' in manifest
print('AIG_AI_HANDOFF_SOURCE_GATE_PASS|DUAL_WEB_COPIES|3_PROJECTS|SOURCE_SHA|NO_FAKE_RUNTIME|LINK')
