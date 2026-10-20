"""Phase16 source-level and real GLB fail-closed geometry tests.
All tests work with synthetic env vars for CI. Never approve cinematic identity.
"""
from __future__ import annotations
import unittest,tempfile,os,json,hashlib,struct,io,sys,math
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from build_fine_hair import make_fine_hair,load_hair15,PHASE15_SOURCE
read_glb=load_hair15(PHASE15_SOURCE if PHASE15_SOURCE.exists() else HERE/'build_hair_cards.py').read_glb

P=HERE.parent
BASE=Path(os.environ.get('AIG_P16_BASE','/mnt/data/AIG_School3D_Phase15_TrueHairCards/out/phase15-real-3d-hair-cards-NOT-APPROVED.glb'))
OUT=Path(os.environ.get('AIG_P16_OUT',str(P/'out/phase16-528-fine-strands-NOT-APPROVED.glb')))
IMAGE=Path(os.environ.get('AIG_P16_IMAGE','/mnt/data/櫻花校園的青春時光.png'))
HAIR=Path(os.environ.get('AIG_P16_HAIR','/mnt/data/AIG_School3D_Phase14_HairFace/hair-face-spec.v1.json'))
ENV=Path(os.environ.get('AIG_P16_ENV','/mnt/data/AIG_School3D_Phase13_Envelope/mesh-envelope.v1.json'))
BUILDER=Path(os.environ.get('AIG_P16_BUILDER','/mnt/data/AIG_School3D_Phase13_Envelope/tools/build_envelope.py'))

def access(g,b,i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']]; comps={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
 fmt={5126:'f',5123:'H',5125:'I'}[a['componentType']]
 return [struct.unpack_from('<'+fmt*comps,b,v.get('byteOffset',0)+a.get('byteOffset',0)+n*struct.calcsize('<'+fmt*comps)) for n in range(a['count'])]

class FineHair(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.g,cls.b=read_glb(OUT);cls.old,cls.oldbin=read_glb(BASE);cls.s=json.loads(HAIR.read_text());cls.e=json.loads(ENV.read_text())
 def test_01_preserve_original_geometric_parts(self):
  self.assertEqual(self.g['meshes'][:18],self.old['meshes'][:18])
  self.assertEqual(self.b[:len(self.oldbin)],self.oldbin)
  self.assertEqual(self.g['skins'],self.old['skins']);self.assertEqual(self.g['animations'],self.old['animations'])
 def test_02_exact_six_primitives_per_original_88_guides(self):
  self.assertEqual(len(self.g['meshes']),106)
  self.assertEqual(sum(len(m['primitives']) for m in self.g['meshes'][18:]),528)
  self.assertTrue(all(len(m['primitives'])==6 for m in self.g['meshes'][18:]))
 def test_03_real_geometry_has_nonzero_depth_taper(self):
  for i in (0,20,43,70,87):
   for p in self.g['meshes'][18+i]['primitives']:
    x=access(self.g,self.b,p['attributes']['POSITION'])
    self.assertEqual(len(x),52)
    self.assertGreater(max(q[2] for q in x)-min(q[2] for q in x),.0017)
    root_dist=math.dist(x[0],x[1]); tip_dist=math.dist(x[-4],x[-3]);self.assertLess(tip_dist,root_dist*.13)
 def test_04_fine_width_really_smaller_than_old_not_only_metadata(self):
  for k in (0,15,44,87):
   oldmesh=self.old['meshes'][18+k]['primitives'][0]
   oldx=access(self.old,self.oldbin,oldmesh['attributes']['POSITION'])
   old_span=math.dist(oldx[0],oldx[1])
   widths=[]
   for p in self.g['meshes'][18+k]['primitives']:
    x=access(self.g,self.b,p['attributes']['POSITION']);widths.append(math.dist(x[0],x[1]))
   self.assertLess(max(widths),old_span*.15)
   self.assertLess(sum(widths),old_span*.85)
 def test_05_alphas_really_encoded_and_embedded_in_glb(self):
  mat=[x for x in self.g['materials'] if x['name'].startswith('AIG_Phase16_FineFiber_')]
  self.assertEqual(len(mat),5)
  self.assertTrue(all(x['alphaMode']=='BLEND' and x['doubleSided'] is True for x in mat))
  img=self.g['images'][-1];v=self.g['bufferViews'][img['bufferView']];chunk=self.b[v['byteOffset']:v['byteOffset']+v['byteLength']]
  im=Image.open(io.BytesIO(chunk)).convert('RGBA');self.assertEqual(im.size,(64,256))
  self.assertEqual(im.getpixel((0,100))[3],0)
  self.assertGreater(im.getpixel((32,5))[3],170)
  self.assertEqual(im.getpixel((32,255))[3],0)
 def test_06_mesh_uses_alpha_texture_and_uv(self):
  tex_idx=len(self.g['textures'])-1
  for m in self.g['meshes'][18:]:
   for p in m['primitives']:
    mat=self.g['materials'][p['material']]
    self.assertEqual(mat['pbrMetallicRoughness']['baseColorTexture']['index'],tex_idx)
    self.assertIn('TEXCOORD_0',p['attributes'])
 def test_07_remap_weights_keep_real_176_joint_animation(self):
  self.assertEqual(len(self.g['skins'][1]['joints']),183)
  self.assertEqual(len(self.g['animations'][-1]['channels']),176)
  for k in (0,44,87):
   for prim in self.g['meshes'][18+k]['primitives']:
    w=access(self.g,self.b,prim['attributes']['WEIGHTS_0']);j=access(self.g,self.b,prim['attributes']['JOINTS_0'])
    self.assertEqual(set(q[:2] for q in j),{(7+2*k,8+2*k)})
    self.assertTrue(all(abs(sum(q)-1)<1e-6 for q in w))
 def test_08_original_photo_sha_and_release_still_blocked(self):
  self.assertEqual(hashlib.sha256(IMAGE.read_bytes()).hexdigest(),self.g['extras']['sourceImageSHA256'])
  self.assertFalse(self.g['extras']['visualAuthorityApproved']);self.assertFalse(self.g['extras']['releaseAllowed'])
  self.assertFalse(self.g['extras']['hasGenuineFacialAI']);self.assertFalse(self.g['extras']['physicsPerSubStrand'])
 def test_09_source_mismatch_hard_fails(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'bad.png';p.write_bytes(IMAGE.read_bytes()+b'altered')
   with self.assertRaises(ValueError):make_fine_hair(BASE,p,HAIR,ENV,BUILDER,Path(d)/'bad.glb')
 def test_10_deterministic_glb_sha(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'rebuilt.glb';v=make_fine_hair(BASE,IMAGE,HAIR,ENV,BUILDER,p)
   self.assertEqual(v['sha256'],hashlib.sha256(OUT.read_bytes()).hexdigest())
 def test_11_child_strands_have_distinct_coords(self):
  for k in (0,30,78):
   p=self.g['meshes'][18+k]['primitives'];a=access(self.g,self.b,p[0]['attributes']['POSITION']);b=access(self.g,self.b,p[1]['attributes']['POSITION']);
   self.assertNotEqual(a[20],b[20])
 def test_12_no_new_bones_or_unobserved_movie_feature(self):
  self.assertEqual(len(self.g['nodes']),len(self.old['nodes']))
  self.assertEqual(len(self.g['animations']),len(self.old['animations']))
  self.assertTrue(self.g['extras']['geometryEstimatedBack'])
  self.assertTrue(self.g['extras']['subStrandsShareSourceBoneMotion'])

if __name__=='__main__':unittest.main()