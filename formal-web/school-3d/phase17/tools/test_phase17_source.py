#!/usr/bin/env python3
"""Phase17 GLB source-image fidelity gates; no photo-to-3D pass is possible here."""
import hashlib,importlib.util,json,os,struct,tempfile,unittest
from pathlib import Path
from PIL import Image
import numpy as np

HERE=Path(__file__).resolve().parent
s=importlib.util.spec_from_file_location('phase17',HERE/'build_source_fidelity.py')
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
# Real paths locally, synthetic artifacts in GitHub Action. NO hardware/Internet assumed.
m.PH15=Path(os.environ.get('AIG_P17_HAIR15','/mnt/data/AIG_School3D_Phase15_TrueHairCards/tools/build_hair_cards.py'))
m.CORE=Path(os.environ.get('AIG_P17_CORE13','/mnt/data/AIG_School3D_Phase16_FineHair/inputs/build_envelope.py'))
P16=Path(os.environ.get('AIG_P17_BASE','/mnt/data/AIG_School3D_Phase16_FineHair/out/phase16-528-fine-strands-NOT-APPROVED.glb'))
P17=Path(os.environ.get('AIG_P17_OUT','/mnt/data/AIG_School3D_Phase17_ReverseFidelity/out/phase17-source-guided-NOT-APPROVED.glb'))
SRC=Path(os.environ.get('AIG_P17_IMAGE','/mnt/data/櫻花校園的青春時光.png'))
HAIR=Path(os.environ.get('AIG_P17_HAIR_SPEC','/mnt/data/AIG_School3D_Phase16_FineHair/inputs/hair-face-spec.v1.json'))
ENV=Path(os.environ.get('AIG_P17_ENV','/mnt/data/AIG_School3D_Phase16_FineHair/inputs/mesh-envelope.v1.json'))

def acc(g,dat,idx):
 a=g['accessors'][idx];v=g['bufferViews'][a['bufferView']];f={5126:'f',5123:'H',5125:'I'}[a['componentType']];n={'VEC2':2,'VEC3':3,'VEC4':4,'SCALAR':1,'MAT4':16}[a['type']]
 return struct.unpack_from('<'+str(a['count']*n)+f,dat,v.get('byteOffset',0)+a.get('byteOffset',0))
class FittedTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.a,cls.core,_=m.modules();cls.old,cls.oldbin=cls.a.read_glb(P16);cls.g,cls.bin=cls.a.read_glb(P17)
  cls.ref=json.loads(HAIR.read_text());cls.env=json.loads(ENV.read_text())
  cls.synthetic=bool(cls.ref.get('gate',{}).get('ciSyntheticFixtureOnly',False))
 def test_01_exact_source_digest(self):
  h=hashlib.sha256(SRC.read_bytes()).hexdigest()
  self.assertEqual(h,self.ref['source']['sha256']);self.assertEqual(h,self.g['extras']['sourceImageSHA256'])
 def test_02_original_mesh_unmodified(self):
  self.assertEqual(self.old['meshes'][:18],self.g['meshes'][:18]);self.assertEqual(self.g['skins'],self.old['skins'])
  self.assertEqual(self.g['animations'],self.old['animations']);self.assertEqual(self.bin[:len(self.oldbin)],self.oldbin)
 def test_03_recon_identity_is_not_self_approved(self):
  self.assertFalse(self.g['extras']['visualAuthorityApproved']);self.assertFalse(self.g['extras']['releaseAllowed'])
  self.assertFalse(self.g['extras']['cameraCalibrated']);self.assertTrue(self.g['extras']['qualityMetricIsHairPixelProxyNot3DFidelity'])
 def test_04_existing_528_beams_retopologized(self):
  self.assertEqual(self.g['extras']['phase17FittedFineStrands'],528)
  self.assertEqual(len(self.g['meshes']),110)
  self.assertEqual(len([p for mesh in self.g['meshes'][18:106] for p in mesh['primitives']]),528)
  self.assertEqual(self.g['extras']['phase17HairGuides'],88)
 def test_05_all_528_contain_alpha_suppression(self):
  active=0;trans=0
  for mesh in self.g['meshes'][18:106]:
   for p in mesh['primitives']:
    c=acc(self.g,self.bin,p['attributes']['COLOR_0']);aa=c[3::4]
    self.assertEqual(len(aa),52)
    self.assertTrue(all(0<=v<=1 for v in aa))
    active+=sum(v>.8 for v in aa);trans+=sum(v<.1 for v in aa)
  if self.synthetic:
   self.assertEqual(active,0,'synthetic white image must not simulate real brown hair')
  else:self.assertGreater(active,50)
  self.assertGreater(trans,100)
 def test_06_actual_png_alpha_in_glb(self):
  g=self.g;last=g['images'][-1];v=g['bufferViews'][last['bufferView']];z=self.bin[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
  from io import BytesIO
  im=Image.open(BytesIO(z));self.assertEqual(im.mode,'RGBA');self.assertEqual(im.size,(625,590))
  self.assertLess(im.getpixel((660-365,210-30))[3],30) # face should never be hair
  if self.synthetic:self.assertEqual(im.getpixel((650-365,80-30))[3],0)
  else:self.assertGreater(im.getpixel((650-365,80-30))[3],0) # actual scalp color
 def test_07_fitted_guide_proxy_improves(self):
  old=self.g['extras']['phase17SourceColorSupportBefore']
  new=self.g['extras']['phase17SourceColorSupportAfter']
  if self.synthetic:self.assertGreaterEqual(new,old) # no photo fidelity claim for a white CI image
  else:self.assertGreater(new,old) # must improve on exact approved pixels
 def test_08_uv_shells_are_real_meshes(self):
  for mesh in self.g['meshes'][-4:]:
   p=mesh['primitives'][0];self.assertTrue(mesh['name'].startswith('Phase17_SourceUVHairShell_'))
   self.assertIn('TEXCOORD_0',p['attributes']);self.assertIn('JOINTS_0',p['attributes']);self.assertEqual(p['mode'],4)
  self.assertEqual(len(self.g['scenes'][0]['nodes'])-len(self.old['scenes'][0]['nodes']),4)
 def test_09_bone_animation_not_reset(self):
  self.assertEqual(self.g['extras']['phase17FittedFineStrands'],528)
  self.assertEqual(len(self.g['animations'][-1]['channels']),176)
  self.assertEqual(len(self.g['nodes']),len(self.old['nodes'])+4)
 def test_10_geometry_does_change_but_scaffold_not(self):
  prev=self.old['meshes'][23]['primitives'][2];new=self.g['meshes'][23]['primitives'][2]
  self.assertNotEqual(prev['attributes']['POSITION'],new['attributes']['POSITION'])
  for key in ('WEIGHTS_0','JOINTS_0','TEXCOORD_0'):
   self.assertEqual(prev['attributes'][key],new['attributes'][key])
 def test_11_do_not_import_any_licensed_character(self):
  self.assertFalse(self.g['extras']['legacyDollGeometryUsed']);self.assertFalse(self.g['extras']['sourceSegmentationFullyAutomatic'])
  self.assertFalse(self.g['extras']['trueFaceDepthRecovered'] if 'trueFaceDepthRecovered' in self.g['extras'] else False)
 def test_12_tampered_source_rejected(self):
  with tempfile.TemporaryDirectory() as td:
   invalid=Path(td)/'photo.png';invalid.write_bytes(SRC.read_bytes()+b'a')
   with self.assertRaises(ValueError):m.make_reconstruction(P16,invalid,HAIR,ENV,Path(td)/'bad.glb',None)
 def test_13_repeat_build_identical_sha(self):
  with tempfile.TemporaryDirectory() as td:
   r=m.make_reconstruction(P16,SRC,HAIR,ENV,Path(td)/'again.glb',None)
   self.assertEqual(r['sha256'],hashlib.sha256(P17.read_bytes()).hexdigest())
 def test_14_source_image_not_touched(self):
  self.assertEqual(hashlib.sha256(SRC.read_bytes()).hexdigest(),self.g['extras']['sourceImageSHA256'])
 def test_15_real_glb2_header(self):
  data=P17.read_bytes();self.assertEqual(struct.unpack_from('<III',data,0),(0x46546c67,2,len(data)))
 def test_16_no_borrowed_AI_face(self):
  self.assertFalse(self.g['extras']['hasGenuineFacialAI']);self.assertFalse(self.g['extras']['visualAuthorityApproved'])
if __name__=='__main__':unittest.main()