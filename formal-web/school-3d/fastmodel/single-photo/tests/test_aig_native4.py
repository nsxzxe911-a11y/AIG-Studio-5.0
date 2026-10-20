"""4.0 real self-authored image volume tests (synthetic only, no external models)."""
import json
import struct
import sys
import tempfile
import unittest
from pathlib import Path
from PIL import Image,ImageDraw
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from aig_native4 import build,foreground,proportions,SCHEMA,ANGLES,digest,main
from glb import audit_glb

class AigNative4Tests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory()
  self.addCleanup(self.tmp.cleanup)
  self.root=Path(self.tmp.name)
  self.front=self.root/'front.png'
  self.side=self.root/'side.png'
  for path,side in [(self.front,False),(self.side,True)]:
   canvas=Image.new('RGBA',(256,384),(0,0,0,0))
   painter=ImageDraw.Draw(canvas)
   offset=18 if side else 0
   painter.ellipse((95-offset//2,22,158-offset//2,90),fill=(153,104,78,255))
   painter.rectangle((112-offset//2,88,140-offset//2,116),fill=(218,166,143,255))
   painter.polygon([(92+offset//2,105),(162-offset//2,105),
                   (174-offset//2,190),(80+offset//2,190)],fill=(208,161,177,255))
   painter.polygon([(88+offset//2,188),(166-offset//2,188),
                    (208-offset//2,258),(49+offset//2,258)],fill=(229,190,203,255))
   painter.rectangle((80+offset//2,115,94+offset//2,210),fill=(219,177,148,255))
   painter.rectangle((161-offset//2,115,175-offset//2,210),fill=(219,177,148,255))
   painter.rectangle((94+offset//2,250,111+offset//2,351),fill=(211,165,151,255))
   painter.rectangle((142-offset//2,250,159-offset//2,351),fill=(211,165,151,255))
   canvas.save(path)
 def test_true_closed_volume_and_eight_projected_angle_images(self):
  original=self.front.read_bytes()
  result=build(self.front,self.root/'generated')
  self.assertEqual(result['schema'],SCHEMA)
  self.assertEqual(result['sourceSHA256'],digest(self.front))
  self.assertEqual(self.front.read_bytes(),original)
  self.assertEqual(result['creditSpend'],0)
  self.assertEqual(result['networkRequestsMade'],0)
  self.assertFalse(result['formalHeroineApproved'])
  self.assertFalse(result['realBodyPartSeparation'])
  self.assertEqual(result['generatedViewYawDegrees'],list(ANGLES))
  self.assertGreater(result['meshVertexCount'],1000)
  self.assertGreater(result['meshTriangleCount'],3000)
  folder=self.root/'generated'
  model=folder/'AIG-4.0-VOLUME-TECHNICAL-NOT-APPROVED.glb'
  audit=audit_glb(model)
  self.assertGreater(audit['triangles'],3000)
  self.assertEqual(audit['skins'],0)
  self.assertEqual(audit['animationClips'],0)
  self.assertEqual(digest(model),result['meshGLBSHA256'])
  self.assertGreater(audit['extentXYZ'][2],.001)
  self.assertEqual(len(list((folder/'unknown-views').glob('*.png'))),8)
  self.assertTrue((folder/'confidence-2D-HEURISTIC.png').is_file())
  doc=json.loads((folder/'scaffold.json').read_text(encoding='utf8'))
  self.assertEqual(doc['sourceMaskMode'],'SOURCE_ALPHA')
  self.assertTrue(doc['missingCameraCalibration'])
  with self.assertRaisesRegex(ValueError,'AIG4_OUTPUT_EXISTS_NO_OVERWRITE'):
   build(self.front,folder)
 def test_side_photo_only_increases_an_observational_constraint_not_quality_approval(self):
  result=build(self.front,self.root/'with-side',self.side)
  self.assertEqual(result['proportions']['depthConstraint'],'OBSERVED_SIDE_SILHOUETTE_ONLY')
  self.assertIsNotNone(result['sideSourceSHA256'])
  self.assertFalse(result['formalHeroineApproved'])
  self.assertTrue(result['unseenSurfacesInferred'])
 def test_heuristic_body_semantics_are_explicitly_uncertain(self):
  profile=proportions(foreground(self.front))
  for key in ('headToBodyRatio','armLengthRatio','legLengthRatio','skirtHemCurve'):
   self.assertIsNone(profile[key]['value'])
   self.assertTrue(profile[key]['status'].startswith('UNCERTAIN'))
  self.assertEqual(profile['poseFacingYaw']['status'],'ASSUMED_FRONT_CAMERA')
 def test_random_busy_photo_is_rejected_no_fake_geometry(self):
  src=self.root/'complex.jpg'
  im=Image.new('RGB',(256,384),(160,160,160))
  pixels=im.load()
  for x in range(256):
   c=(10,240,30) if x%2 else (240,10,230)
   pixels[x,0]=c;pixels[x,383]=c
  for y in range(384):
   pixels[0,y]=(240,10,230) if y%2 else (10,240,30)
   pixels[255,y]=(10,240,30) if y%2 else (240,10,230)
  im.save(src)
  with self.assertRaisesRegex(ValueError,'AIG4_COMPLEX_BACKGROUND_USE_RGBA_MASK'):
   build(src,self.root/'bad')
  self.assertFalse((self.root/'bad').exists())
 def test_no_network_or_proprietary_inference_invocations(self):
  code=(Path(__file__).resolve().parents[1]/'aig_native4.py').read_text(encoding='utf8')
  self.assertNotIn('MeshyClient',code)
  self.assertNotIn('requests.post(',code)
  self.assertNotIn('subprocess.run(',code)
  self.assertNotIn('StableFast3D',code)
  self.assertIn('inferredUnseenGeometry',code)
  self.assertEqual(main(['--source',str(self.front),'--out',str(self.root/'ignored'),'--check-only']),0)
  self.assertFalse((self.root/'ignored').exists())

if __name__=='__main__':unittest.main()
