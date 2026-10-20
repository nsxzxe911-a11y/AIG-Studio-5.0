"""Automated Phase9 mesh-first inverse-bind, weight and baked IK tests."""
import copy
import hashlib
import json
import os
import tempfile
import unittest
from pathlib import Path
import numpy as np
from fit_mesh_first_rig import Bundle,bind_to_target,bones_global,adjust_animation_translation
from prepare_qa_mesh import build as build_candidate
from verify_mesh_first import audit
from verify_fit_foot_contact import verify_fit_contact

DIR=Path(__file__).parent
SRC=Path(os.environ.get('AIG_PHASE9_SOURCE_GLB',DIR/'phase6-source-NOT-APPROVED.glb'))

class TestMeshFirstRetarget(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory()
  cls.path=Path(cls.tmp.name)
  cls.mesh=cls.path/'target.glb';cls.anchors=cls.path/'anchors.json';cls.result=cls.path/'fitted.glb'
  build_candidate(SRC,cls.mesh,cls.anchors,scale=.78)
  cls.stats=bind_to_target(SRC,cls.mesh,cls.anchors,cls.result)
 @classmethod
 def tearDownClass(cls):cls.tmp.cleanup()
 def test_only_target_mesh_controls_geometry(self):
  report=audit(self.mesh,self.result)
  self.assertTrue(report['pass_mesh_untouched'])
  self.assertEqual(report['primitives'],195)
  self.assertLess(report['restPoseErrorMax'],1e-6)
 def test_all_weights_recomputed_normalized(self):
  self.assertGreater(self.stats['blendVertices'],40000)
  self.assertEqual(self.stats['jointCount'],33)
 def test_model_size_matches_target_not_old_bones(self):
  b=Bundle(self.result);s=Bundle(SRC)
  new=bones_global(b.g,b.g['skins'][0]['joints'])
  old=bones_global(s.g,s.g['skins'][0]['joints'])
  for key in ('Hips','Head','LeftFoot','RightFoot'):
   np.testing.assert_allclose(new[key],old[key]*.78,atol=1e-6)
 def test_ik_stance_scaled_without_sliding(self):
  r=verify_fit_contact(self.result)
  self.assertEqual(r['status'],'JOINT_CONTACT_PASS_NOT_SHOE_CONTACT')
  self.assertTrue(all(x['stanceXzDriftModelUnits']<1e-6 for x in r['legs'].values()))
 def test_no_visual_approval_promoted(self):
  m=Bundle(self.result).g
  self.assertEqual(m['extras']['AIGSchool3DProvenance']['visualApproval'],'NOT_APPROVED')
  self.assertIn('NOT VISUAL AUTHORITY',m['asset']['generator'])
 def test_wrong_mesh_digest_is_rejected(self):
  q=self.path/'wrong.json';d=json.loads(self.anchors.read_text());d['targetMeshSHA256']='0'*64
  q.write_text(json.dumps(d))
  with self.assertRaisesRegex(ValueError,'SHA mismatch'):
   bind_to_target(SRC,self.mesh,q,self.path/'bad.glb')
 def test_2d_pixel_as_3d_rejected(self):
  q=self.path/'pixels.json';d=json.loads(self.anchors.read_text());d['sourceLandmarks']='2D_IMAGE_PIXELS'
  q.write_text(json.dumps(d))
  with self.assertRaisesRegex(ValueError,'2D pixel landmarks'):
   bind_to_target(SRC,self.mesh,q,self.path/'bad2.glb')
 def test_missing_bone_fails_closed(self):
  q=self.path/'missing.json';d=json.loads(self.anchors.read_text());d['3dJointPositionsUnitless'].pop('Head')
  q.write_text(json.dumps(d))
  with self.assertRaisesRegex(ValueError,'bone anchors'):
   bind_to_target(SRC,self.mesh,q,self.path/'bad3.glb')
 def test_nonuniform_limb_change_blocks_ik(self):
  b=Bundle(self.mesh)
  src=Bundle(SRC)
  joints=src.g['skins'][0]['joints']
  old=bones_global(src.g,joints)
  changed={n:p.copy() for n,p in old.items()}
  for n in changed:
   changed[n]=np.array([changed[n][0]*.5,changed[n][1]*.95,changed[n][2]])
  state=adjust_animation_translation(b,old,changed,joints)
  self.assertFalse(state['IKplaybackAllowed'])
  self.assertTrue(any(a['name'].startswith('IK_REQUIRES_RETARGET_') for a in b.g['animations']))
 def test_deterministic_output(self):
  second=self.path/'second.glb';info=bind_to_target(SRC,self.mesh,self.anchors,second)
  self.assertEqual(info['sha256'],hashlib.sha256(self.result.read_bytes()).hexdigest())
 def test_approved_mesh_cannot_be_faked(self):
  q=self.path/'fakeapproval.json';d=json.loads(self.anchors.read_text())
  d['visualApproval']='APPROVED';d['approvedMeshSHA256']=None;q.write_text(json.dumps(d))
  with self.assertRaisesRegex(ValueError,'unverified target'):
   bind_to_target(SRC,self.mesh,q,self.path/'notreleased.glb')
if __name__=='__main__':unittest.main()