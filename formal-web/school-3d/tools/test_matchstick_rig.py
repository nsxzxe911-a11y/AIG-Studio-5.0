import hashlib,json,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_matchstick_spec import spec_for
HERE=Path(__file__).resolve().parent
# CI: put this file in tools/, images/manifests in school-3d/; local also supported.
BASE=HERE.parent if (HERE.parent/'reverse-authority.v1.json').exists() else HERE
REVERSE=BASE/'reverse-authority.v1.json' if (BASE/'reverse-authority.v1.json').exists() else HERE/'reverse-authority-local.json'
SPEC=BASE/'matchstick-rig.v1.json' if (BASE/'matchstick-rig.v1.json').exists() else HERE/'matchstick-rig.v1.json'
class TestMatchstickReverseContract(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.r=json.loads(REVERSE.read_text(encoding='utf8'));cls.s=json.loads(SPEC.read_text(encoding='utf8'))
 def test_01_pixel_aligned_to_source_authority(self):
  self.assertEqual(self.s['authorityImage']['sha256'],self.r['source']['sha256'])
  self.assertEqual(self.s['authorityImage']['width'],1672)
  self.assertEqual(self.s['authorityImage']['height'],941)
 def test_02_produced_contract_exact_deterministic(self):
  self.assertEqual(spec_for(self.r),self.s)
 def test_03_bones_are_thin_visual_lines_not_mesh(self):
  self.assertLessEqual(self.s['style']['strokeWidthSourcePixels'],3)
  self.assertLessEqual(self.s['style']['maxStrokeWidthSourcePixels'],3)
  self.assertTrue(self.s['style']['visualThicknessOnly'])
  self.assertIsNone(self.s['sizingContract']['anyPhysicalBoneRadius'])
  self.assertFalse(self.s['sizingContract']['allowDebugBoneProxyVolume'])
 def test_04_2d_points_are_not_3d_landmarks(self):
  self.assertEqual(self.s['coordinateType'],'IMAGE_PIXELS_NOT_3D')
  self.assertFalse(self.s['sizingContract']['allow2DPixelsAs3DAnchors'])
  self.assertTrue(all(x['coordinateType']=='IMAGE_PIXELS_NOT_3D' for x in self.s['nodes'].values()))
 def test_05_mesh_is_immutable_against_legacy_rig(self):
  c=self.s['sizingContract'];self.assertTrue(c['meshGeometryAlwaysWins'])
  self.assertFalse(c['allowBonesToStretchMesh'])
  self.assertFalse(c['allowFitImageToLegacyRig']);self.assertFalse(c['oldRigScaleIsAuthority'])
 def test_06_only_observable_body_axes_no_fake_legs(self):
  self.assertTrue(self.s['visibility']['legsUnobservableFromApprovedCrop'])
  self.assertTrue(self.s['visibility']['doNotInventHiddenJoints'])
  self.assertNotIn('LeftFoot',self.s['nodes'])
 def test_07_all_segment_endpoints_exist(self):
  for l in self.s['segments']:
   self.assertIn(l['a'],self.s['nodes']);self.assertIn(l['b'],self.s['nodes'])
 def test_08_blocked_for_homepage_and_3d_reconstruction(self):
  self.assertFalse(self.s['release']['webHeroAllowed'])
  self.assertFalse(self.s['release']['trueFemaleRigged3DCharacterAvailable'])
 def test_09_no_legacy_doll_asset_paths(self):
  s=json.dumps(self.s).lower()
  for bad in ('phase6-technical-only.glb','aig_human_final.glb','approvedcharacter.glb'):
   self.assertNotIn(bad,s)
 def test_10_original_keypoint_exactly_preserved(self):
  for n in ('crown','chin','neck_base','left_shoulder','right_shoulder','waistline'):
   self.assertEqual(self.s['nodes'][n]['xy'],self.r['estimatedVisibleKeypoints'][n]['xy'])
if __name__=='__main__':unittest.main()