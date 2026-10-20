"""Real synthetic-image integration; no real heroine or hardware approval."""
import hashlib
import json
import struct
import subprocess
import sys
import tempfile
import unittest
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'fastmodel/tools/image_to_animation.py'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def synthetic_png(width=1672, height=941):
    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data
                + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))
    pixels = (b'\0' + bytes((126, 132, 145)) * width) * height
    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(pixels)) + chunk(b'IEND', b''))


class ImageToAnimationTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.image = self.base / 'reference image.png'
        self.image.write_bytes(synthetic_png())
        self.envelope = self.base / 'envelope.json'
        self.hair = self.base / 'hair.json'
        for original, dest in [('phase13/mesh-envelope.v1.json', self.envelope),
                               ('phase14/hair-face-spec.v1.json', self.hair)]:
            data = json.loads((ROOT / original).read_text(encoding='utf8'))
            data['source']['sha256'] = digest(self.image)
            if dest == self.hair:
                data['gate']['ciSyntheticFixtureOnly'] = True
            dest.write_text(json.dumps(data), encoding='utf8')
        self.out = self.base / 'animation output'

    def run_cli(self, *extra):
        self.assertTrue(SCRIPT.is_file(), 'single-command image-to-animation entry missing')
        return subprocess.run([sys.executable, str(SCRIPT), '--source', str(self.image),
                               '--envelope-spec', str(self.envelope), '--hair-spec', str(self.hair),
                               '--out', str(self.out), *extra],
                              capture_output=True, text=True, timeout=150)

    def test_preflight_does_not_claim_generation_or_touch_source(self):
        before = [digest(p) for p in (self.image, self.envelope, self.hair)]
        run = self.run_cli('--check-only')
        self.assertEqual(run.returncode, 0, run.stderr)
        report = json.loads(run.stdout)
        self.assertEqual(report['status'], 'INPUTS_VERIFIED_NOT_GENERATED')
        self.assertFalse(report['releaseAllowed'])
        self.assertEqual(len(report['stages']), 5)
        self.assertFalse(self.out.exists())
        self.assertEqual(before, [digest(p) for p in (self.image, self.envelope, self.hair)])

    def test_mismatched_source_refuses_to_rebind_authority_hash(self):
        spec = json.loads(self.hair.read_text())
        spec['source']['sha256'] = '0' * 64
        self.hair.write_text(json.dumps(spec))
        run = self.run_cli()
        self.assertNotEqual(run.returncode, 0)
        self.assertIn('SOURCE_SHA_MISMATCH', run.stderr)
        self.assertFalse(self.out.exists())
        self.assertEqual(json.loads(self.hair.read_text())['source']['sha256'], '0' * 64)

    def test_existing_work_is_never_overwritten(self):
        self.out.mkdir()
        marker = self.out / 'unsaved.glb'
        marker.write_bytes(b'working copy')
        run = self.run_cli()
        self.assertNotEqual(run.returncode, 0)
        self.assertIn('OUTPUT_EXISTS', run.stderr)
        self.assertEqual(marker.read_bytes(), b'working copy')

    def test_source_specific_layout_rejects_wrong_dimensions_before_build(self):
        self.image.write_bytes(synthetic_png(64, 64))
        for dest in (self.envelope, self.hair):
            doc = json.loads(dest.read_text())
            doc['source']['sha256'] = digest(self.image)
            dest.write_text(json.dumps(doc))
        run = self.run_cli()
        self.assertNotEqual(run.returncode, 0)
        self.assertIn('SOURCE_LAYOUT_UNSUPPORTED', run.stderr)
        self.assertFalse(self.out.exists())

    def test_approval_flags_cannot_convert_technical_output_into_formal_model(self):
        doc = json.loads(self.envelope.read_text())
        doc['approved3DModel'] = True
        self.envelope.write_text(json.dumps(doc))
        run = self.run_cli()
        self.assertNotEqual(run.returncode, 0)
        self.assertIn('TECHNICAL_ONLY', run.stderr)
        self.assertFalse(self.out.exists())

    def test_incompatible_hair_spec_fails_without_publishing_partial_output(self):
        doc = json.loads(self.hair.read_text())
        doc['hair']['strands'] = []
        self.hair.write_text(json.dumps(doc))
        run = self.run_cli()
        self.assertNotEqual(run.returncode, 0)
        self.assertIn('HAIR_GUIDES_UNSUPPORTED', run.stderr)
        self.assertFalse(self.out.exists())

    def test_real_stage_failure_cleans_only_owned_temporary_work(self):
        doc = json.loads(self.envelope.read_text())
        del doc['regions']
        self.envelope.write_text(json.dumps(doc))
        before = digest(self.envelope)
        run = self.run_cli()
        self.assertNotEqual(run.returncode, 0)
        self.assertIn('STAGE_FAILED: envelope', run.stderr)
        self.assertFalse(self.out.exists())
        self.assertEqual(list(self.base.glob('.aig-animation-*')), [])
        self.assertEqual(digest(self.envelope), before)

    def test_full_image_to_skinned_animation_and_offline_page(self):
        before = {str(p): digest(p) for p in (self.image, self.envelope, self.hair)}
        run = self.run_cli()
        self.assertEqual(run.returncode, 0, run.stderr)
        result = json.loads(run.stdout)
        self.assertEqual(result['status'], 'TECHNICAL_ANIMATION_BUILT')
        manifest = json.loads((self.out / 'pipeline-report.json').read_text())
        self.assertFalse(manifest['releaseAllowed'])
        self.assertFalse(manifest['actualDeviceFpsVerified'])
        self.assertTrue(manifest['syntheticFixtureOnly'])
        self.assertFalse(manifest['automaticSegmentation'])
        self.assertEqual([s['status'] for s in manifest['stages']], ['PASS'] * 5)
        for artifact in manifest['artifacts']:
            self.assertEqual(digest(self.out / artifact['path']), artifact['sha256'])
        raw = (self.out / 'character-NOT-APPROVED.glb').read_bytes()
        length = struct.unpack_from('<I', raw, 12)[0]
        gltf = json.loads(raw[20:20 + length])
        self.assertEqual(len(gltf['skins']), 2)
        self.assertGreater(len(gltf['animations']), 0)
        self.assertEqual(gltf['extras']['sourceImageSHA256'], digest(self.image))
        self.assertFalse(gltf['extras']['releaseAllowed'])
        # Evaluate ACTUAL exported animation data; a static GLB must fail this test.
        sample = r'''
import fs from 'node:fs';
import {decodeGLB,readAccessor} from './formal-web/school-3d/fastmodel/web/fastmodel-data.mjs';
import {createPoseEvaluator} from './formal-web/school-3d/fastmodel/web/pose-evaluator.mjs';
const raw=fs.readFileSync(process.argv[1]);
const f=decodeGLB(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
const a=f.g.animations[0],ch=a.channels[0],s=a.samplers[ch.sampler];
const e=createPoseEvaluator(f.g.nodes,[{node:ch.target.node,times:readAccessor(f,s.input),values:readAccessor(f,s.output)}]);
const first=Array.from(e.evaluate(0)[ch.target.node]);
const moved=Array.from(e.evaluate(.75)[ch.target.node]);
if(!first.some((v,i)=>Math.abs(v-moved[i])>1e-4))process.exit(1);
'''
        check = subprocess.run(['node', '--input-type=module', '-e', sample,
                                str(self.out / 'character-NOT-APPROVED.glb')],
                               cwd=ROOT.parents[1], capture_output=True, text=True)
        self.assertEqual(check.returncode, 0, check.stderr)
        html = (self.out / 'animation-offline.html').read_text(encoding='utf8')
        js = 'window.AIG_EMBEDDED_GLB=' + html.split('window.AIG_EMBEDDED_GLB=', 1)[1].split('</script>', 1)[0]
        script = self.base / 'offline.js'
        script.write_text(js, encoding='utf8')
        # HTML uses a CLASSIC script, not Node's automatic module detection.
        check = subprocess.run(['node', '-e',
                                "new (require('node:vm').Script)(require('node:fs').readFileSync(process.argv[1],'utf8'))",
                                str(script)], capture_output=True, text=True)
        self.assertEqual(check.returncode, 0, check.stderr)
        self.assertEqual(before, {str(p): digest(p) for p in (self.image, self.envelope, self.hair)})


if __name__ == '__main__':
    unittest.main()
