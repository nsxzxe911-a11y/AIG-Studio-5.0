#!/usr/bin/env python3
"""FastModel 2.6: connect existing source-specific Python -> GLB -> JS/GLSL tools.

This is the manually guided 1672x941 Phase13-17 layout, NOT arbitrary-photo
AI reconstruction. Source images/specs are immutable; output is a NEW directory.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import struct
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TOOLS = {
    'envelope': ROOT / 'phase13/tools/build_envelope.py',
    'hair': ROOT / 'phase15/tools/build_hair_cards.py',
    'fine_hair': ROOT / 'phase16/tools/build_fine_hair.py',
    'source_fidelity': ROOT / 'phase17/tools/build_source_fidelity.py',
    'offline_player': ROOT / 'fastmodel/tools/build_standalone.py',
}


def sha256(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def write_json(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf8')


def preflight(source, envelope, hair, out):
    source, envelope, hair, out = map(lambda p: Path(p).resolve(), (source, envelope, hair, out))
    if out.exists():
        raise ValueError('OUTPUT_EXISTS: choose a new output directory; no overwrite')
    for path in (source, envelope, hair, *TOOLS.values()):
        if not path.is_file():
            raise ValueError('INPUT_OR_TOOL_MISSING: ' + str(path))
    specs = [json.loads(p.read_text(encoding='utf8')) for p in (envelope, hair)]
    actual_sha = sha256(source)
    for doc in specs:
        if doc.get('source', {}).get('sha256') != actual_sha:
            raise ValueError('SOURCE_SHA_MISMATCH: source and manual guides must match; hashes are never rebound')
        if doc.get('approved3DModel') is not False or doc.get('releasedToHomepage', False) is not False:
            raise ValueError('TECHNICAL_ONLY: this pipeline cannot approve a formal 3D model')
    if specs[0].get('releaseAllowed') is not False:
        raise ValueError('TECHNICAL_ONLY: envelope must remain unreleased')
    header = source.read_bytes()[:24]
    if len(header) != 24 or header[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('SOURCE_LAYOUT_UNSUPPORTED: PNG required')
    size = struct.unpack('>II', header[16:24])
    if size != (1672, 941) or any((d['source'].get('width'), d['source'].get('height')) != size for d in specs):
        raise ValueError('SOURCE_LAYOUT_UNSUPPORTED: Phase17 uses manually calibrated 1672x941 regions')
    if len(specs[1].get('hair', {}).get('strands', [])) != 88:
        raise ValueError('HAIR_GUIDES_UNSUPPORTED: existing Phase15-17 require 88 manual guides')
    # Validate actual image decoding BEFORE any output publication or long-running tool.
    from PIL import Image
    with Image.open(source) as image:
        image.verify()
    return {
        'status': 'INPUTS_VERIFIED_NOT_GENERATED',
        'sourceSHA256': actual_sha,
        'inputs': {name: {'path': str(p), 'sha256': sha256(p)}
                   for name, p in [('source', source), ('envelope', envelope), ('hair', hair)]},
        'stages': list(TOOLS),
        'syntheticFixtureOnly': specs[1].get('gate', {}).get('ciSyntheticFixtureOnly') is True,
        'automaticSegmentation': False,
        'true3DReconstruction': False,
        'releaseAllowed': False,
        'actualDeviceFpsVerified': False,
    }


def inspect_glb(path, source_sha):
    raw = path.read_bytes()
    if len(raw) < 28 or struct.unpack_from('<III', raw) != (0x46546c67, 2, len(raw)):
        raise ValueError('OUTPUT_GLB_INVALID')
    length, kind = struct.unpack_from('<II', raw, 12)
    if kind != 0x4e4f534a or length > len(raw) - 20:
        raise ValueError('OUTPUT_GLB_JSON_INVALID')
    doc = json.loads(raw[20:20 + length])
    extras = doc.get('extras', {})
    if extras.get('sourceImageSHA256') != source_sha or extras.get('releaseAllowed') is not False:
        raise ValueError('OUTPUT_SOURCE_OR_RELEASE_MISMATCH')
    if not doc.get('skins') or not doc.get('animations'):
        raise ValueError('OUTPUT_MISSING_SKIN_OR_ANIMATION')
    return {'skins': len(doc['skins']), 'meshes': len(doc['meshes']),
            'clips': [{'name': a.get('name'), 'channels': len(a.get('channels', []))}
                      for a in doc['animations']]}


def build(source, envelope, hair, out):
    report = preflight(source, envelope, hair, out)
    out = Path(out).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    # Same filesystem as final output: failed stages cannot publish a partial scene.
    with tempfile.TemporaryDirectory(prefix='.aig-animation-', dir=out.parent) as temporary:
        work = Path(temporary) / 'result'
        work.mkdir()
        inputs = work / 'inputs'
        inputs.mkdir()
        for name, dest in [('source', 'reference.png'), ('envelope', 'envelope.json'), ('hair', 'hair.json')]:
            origin = report['inputs'][name]
            target = inputs / dest
            shutil.copyfile(origin['path'], target)
            if sha256(target) != origin['sha256']:
                raise ValueError('INPUT_CHANGED_DURING_COPY: ' + name)
        src, env, hs = inputs / 'reference.png', inputs / 'envelope.json', inputs / 'hair.json'
        core = str(TOOLS['envelope'])
        base_args = ['--source', str(src), '--hair-spec', str(hs), '--envelope-spec', str(env)]
        p13, p15, p16 = [work / f'{name}-TECHNICAL.glb' for name in ('envelope', 'hair', 'fine-hair')]
        final = work / 'character-NOT-APPROVED.glb'
        stages = [
            ('envelope', ['--source', str(src), '--spec', str(env), '--out', str(p13),
                          '--report', str(work / 'envelope-report.json')]),
            ('hair', base_args + ['--base', str(p13), '--phase13-builder', core, '--out', str(p15),
                                 '--report', str(work / 'hair-report.json')]),
            ('fine_hair', base_args + ['--base', str(p15), '--phase13-builder', core, '--out', str(p16),
                                      '--report', str(work / 'fine-hair-report.json')]),
            ('source_fidelity', base_args + ['--base', str(p16), '--phase13-builder', core,
                                            '--phase15-builder', str(TOOLS['hair']), '--out', str(final),
                                            '--report', str(work / 'source-fidelity-report.json')]),
            ('offline_player', ['--glb', str(final), '--out', str(work / 'animation-offline.html')]),
        ]
        report['stages'] = []
        for name, arguments in stages:
            started = time.perf_counter()
            tool = TOOLS[name]
            with (work / f'{name}.log').open('w', encoding='utf8') as log:
                run = subprocess.run([sys.executable, '-X', 'utf8', str(tool), *arguments],
                                     stdout=log, stderr=subprocess.STDOUT, timeout=120,
                                     cwd=ROOT, encoding='utf8')
            if run.returncode:
                details = (work / f'{name}.log').read_text(encoding='utf8')[-2000:]
                raise ValueError(f'STAGE_FAILED: {name}, exit={run.returncode}\n{details}')
            report['stages'].append({'name': name, 'status': 'PASS',
                                     'elapsedCpuHostWallMs': round((time.perf_counter() - started) * 1000, 3),
                                     'toolSHA256': sha256(tool), 'log': f'{name}.log'})
        report['animation'] = inspect_glb(final, report['sourceSHA256'])
        # Snapshot builds cannot silently succeed while the user's originals changed.
        for name, item in report['inputs'].items():
            if sha256(item['path']) != item['sha256']:
                raise ValueError('INPUT_CHANGED_DURING_BUILD: ' + name)
        report['status'] = 'TECHNICAL_ANIMATION_BUILT'
        report['pipelineVersion'] = '2.6.0'
        report['pipelineSHA256'] = sha256(__file__)
        report['artifacts'] = [{'path': p.relative_to(work).as_posix(),
                                'bytes': p.stat().st_size, 'sha256': sha256(p)}
                               for p in sorted(work.rglob('*')) if p.is_file()]
        write_json(work / 'pipeline-report.json', report)
        if out.exists():
            raise ValueError('OUTPUT_EXISTS: output appeared during build; preserved')
        work.rename(out)
    return {'status': report['status'], 'pipelineVersion': '2.6.0', 'out': str(out),
            'report': str(out / 'pipeline-report.json'), 'releaseAllowed': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, help='PNG matching the manual source SHA and layout')
    parser.add_argument('--envelope-spec', default=str(ROOT / 'phase13/mesh-envelope.v1.json'))
    parser.add_argument('--hair-spec', default=str(ROOT / 'phase14/hair-face-spec.v1.json'))
    parser.add_argument('--out', required=True, help='NEW directory; existing work is never overwritten')
    parser.add_argument('--check-only', action='store_true', help='Validate inputs; do not generate output')
    args = parser.parse_args()
    try:
        action = preflight if args.check_only else build
        result = action(args.source, args.envelope_spec, args.hair_spec, args.out)
    except (ValueError, OSError, KeyError, TypeError, ImportError, subprocess.TimeoutExpired) as error:
        print(json.dumps({'status': 'BLOCKED', 'message': str(error), 'releaseAllowed': False},
                         ensure_ascii=False), file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    sys.exit(main())
