#!/usr/bin/env python3
"""Phase6 gate: analytic + GLB-baked ankle/stance kinematics; NOT visual approval."""
import os,sys,unittest,tempfile,hashlib
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_rig_phase6 import walk_ik,make_model
from verify_foot_contact_phase6 import verify_contact

class Phase6IKTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.src=Path(os.environ.get('AIG_PHASE6_PBR_DIR',str(Path(__file__).resolve().parents[2]/'AIG_3D_V1_Phase3'/'generated-materials')))
  if not cls.src.is_dir():raise RuntimeError('PBR input files MISSING — fail, never silently skip')
  cls.d=tempfile.TemporaryDirectory();cls.target=Path(cls.d.name)/'hero-phase6-NOT-APPROVED.glb'
  cls.info=make_model(cls.src,cls.target)
 @classmethod
 def tearDownClass(cls):
  if hasattr(cls,'d'):cls.d.cleanup()
 def test_geometry_is_real_but_unapproved(self):
  self.assertGreater(cls_info:=self.info['triangles'],86000)
  self.assertEqual(self.info['joints'],33)
  self.assertEqual(self.info['visualAuthority'],'NOT_APPROVED')
  self.assertEqual(self.info['textures'],9)
 def test_analytic_stance_ankle_no_world_space_slide(self):
  for side in ('Left','Right'):
   samples=[walk_ik(t)[side] for t in np.linspace(0,2,81)]
   stance=[x for x in samples if x['stance']]
   self.assertLess(max(x['fk'][1] for x in stance)-min(x['fk'][1] for x in stance),1e-6)
   self.assertLess(max(x['fk'][0] for x in stance)-min(x['fk'][0] for x in stance),1e-6)
   self.assertGreater(max(x['fk'][0] for x in samples)-min(x['fk'][0] for x in stance),.06)
 def test_serialized_glb_foot_contact(self):
  p=verify_contact(self.target)
  self.assertTrue(p['pass'])
  self.assertEqual(p['frames'],81)
  for x in p['by_leg'].values():
   self.assertLess(x['world_space_stance_z_span_m'],1e-6)
   self.assertGreater(x['swing_joint_lift_m'],.069)
 def test_rebuild_binary_deterministic(self):
  with tempfile.TemporaryDirectory() as d:
   q=Path(d)/'other.glb';r=make_model(self.src,q)
   self.assertEqual(r['sha256'],hashlib.sha256(self.target.read_bytes()).hexdigest())
   self.assertEqual(q.read_bytes(),self.target.read_bytes())

if __name__=='__main__':unittest.main()