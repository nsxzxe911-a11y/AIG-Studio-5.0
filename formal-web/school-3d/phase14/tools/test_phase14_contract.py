"""Unmodified original AIG image authority and new purely algorithmic hair/face stage."""
import unittest, json, re, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class TestBeautyContract(unittest.TestCase):
 def setUp(self):
  self.s=json.loads((ROOT/'hair-face-spec.v1.json').read_text(encoding='utf8'))
  self.h=(ROOT/'hair-face-workbench.v1.html').read_text(encoding='utf8')
  self.j=(ROOT/'hair-face-workbench.v1.js').read_text(encoding='utf8')
 def test_authority_digest_locked(self):
  self.assertEqual(self.s['source']['sha256'],'83b5728f34f6d3cc266d33e17fe259c44314b265fbf24d6d7a8eb971c316e910')
 def test_approved_image_local_exact_hash(self):
  p=Path('/mnt/data/櫻花校園的青春時光.png')
  if not p.exists():self.skipTest('Reference binary not committed to GitHub; local SHA test only')
  self.assertEqual(hashlib.sha256(p.read_bytes()).hexdigest(),self.s['source']['sha256'])
 def test_88_guides_and_9_nodes(self):
  self.assertEqual(len(self.s['hair']['strands']),88)
  self.assertEqual(self.s['hair']['segmentsPerStrand'],9)
 def test_unique_guides(self):
  ids=[g['id'] for g in self.s['hair']['strands']]
  self.assertEqual(len(ids),len(set(ids)))
 def test_original_image_bounds(self):
  for g in self.s['hair']['strands']:
   for p in (g['root'],g['tip']):
    self.assertTrue(0<=p[0]<=self.s['source']['width'] and 0<=p[1]<=self.s['source']['height'])
 def test_face_warp_limited(self):
  self.assertLessEqual(self.s['face']['maxWarpPixels'],5)
 def test_ai_not_claimed(self):
  self.assertFalse(self.s['gate']['aiModelAvailable'])
  self.assertIn('no neural inference',self.s['face']['method'])
 def test_release_blocked(self):
  self.assertFalse(self.s['approved3DModel'])
  self.assertFalse(self.s['releasedToHomepage'])
 def test_html_spec_matches_exact(self):
  a=re.search(r'<script id="hairSpec" type="application/json">(.*?)</script>',self.h,re.S)
  self.assertIsNotNone(a)
  self.assertEqual(json.loads(a.group(1)),self.s)
 def test_orig_P13_mesh_untouched(self):
  self.assertTrue((ROOT.parent/'phase13'/'mesh-envelope.v1.json').exists() or (Path('/mnt/data/AIG_School3D_Phase13_Envelope')/'mesh-envelope.v1.json').exists())
 def test_window_uses_aligned_source(self):
  self.assertIn('hairSpec.source.sha256',self.j)
  self.assertIn('engine.faceWarp',self.j)
 def test_software_offline_input(self):
  self.assertIn('accept="image/png"',self.h)
  self.assertNotIn('https://cdn.',self.h)
 def test_spring_source_exists(self):
  self.assertIn('s.points[j]',(ROOT/'beauty-engine.v1.js').read_text(encoding='utf8'))
 def test_sketch_image_function_exists(self):
  self.assertIn('function colorSketch',(ROOT/'beauty-engine.v1.js').read_text(encoding='utf8'))
 def test_export_retains_blocked_state(self):
  self.assertIn('result.approved3DModel=false',self.j)
 def test_no_old_manikin_asset(self):
  self.assertNotIn('hero-rig-Phase6',self.h+self.j)
if __name__=='__main__': unittest.main()