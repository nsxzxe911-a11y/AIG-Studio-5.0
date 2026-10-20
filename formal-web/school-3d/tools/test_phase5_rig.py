"""AIG Phase5 QA fixture tests — NOT visual approval."""
import sys,unittest,hashlib,tempfile
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).parent))
sys.path.insert(0,str(Path(__file__).parent.parent.parent/'AIG_3D_V1_Phase4/tools'))
from build_rig_phase5 import make_model,NAME_TO_BONE
from verify_prototype import parse,acc_array,verify

import os
MATERIALS_PATH=Path(os.environ.get('AIG_PHASE5_MATERIALS_DIR',str(Path(__file__).resolve().parent.parent.parent/'AIG_3D_V1_Phase3/generated-materials')))

class TestPhase5(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  if not MATERIALS_PATH.is_dir():
   raise RuntimeError('Missing generated PBR materials; CI must FAIL, not skip')
  cls.d=tempfile.TemporaryDirectory();cls.p=Path(cls.d.name)/'rig.glb'
  cls.info=make_model(MATERIALS_PATH,cls.p);cls.doc,cls.data=parse(cls.p)
 @classmethod
 def tearDownClass(cls):
  if hasattr(cls,'d'):cls.d.cleanup()
 def test_glb_geometry_and_inverse_binds(self):
  self.assertTrue(verify(self.p)['valid_glTF2_technical'])
  self.assertGreaterEqual(self.info['triangles'],85000)
  self.assertGreaterEqual(self.info['joints'],33)
  self.assertEqual(len(self.doc['skins']),1)
 def test_skinned_weight_blending_is_real_not_rigid(self):
  blended=0
  for mesh in self.doc['meshes']:
   for primitive in mesh['primitives']:
    w=acc_array(self.doc,self.data,primitive['attributes']['WEIGHTS_0'])
    blended+=int(np.count_nonzero(w[:,1]>.001))
  self.assertGreater(blended,3000,'Expected genuine two-bone blending, not 100% rigid weights')
 def test_face_expression_and_named_animations(self):
  face=[m for m in self.doc['meshes'] if m.get('extras',{}).get('targetNames')==['Blink','Smile']]
  self.assertEqual(len(face),1)
  clips={a['name']:a for a in self.doc['animations']}
  self.assertTrue({'Idle_Breath_Blink','Walk_Grounded_Test'}<=set(clips))
  self.assertGreaterEqual(len(clips['Walk_Grounded_Test']['channels']),10)
 def test_reproducible_bytes(self):
  with tempfile.TemporaryDirectory() as tmp:
   q=Path(tmp)/'second.glb';info=make_model(MATERIALS_PATH,q)
   self.assertEqual(hashlib.sha256(self.p.read_bytes()).hexdigest(),info['sha256'])
 def test_visual_must_remain_blocked(self):
  self.assertEqual(self.info['visualAuthority'],'NOT_APPROVED')
  self.assertIn('NOT VISUAL AUTHORITY',self.doc['asset']['generator'])
if __name__=='__main__':unittest.main()
