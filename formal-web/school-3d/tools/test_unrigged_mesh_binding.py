"""End-to-end tests for independent unrigged GLB import; explicit no visual approval."""
import copy,hashlib,json,sys,tempfile,unittest
from pathlib import Path
import numpy as np
from fit_mesh_first_rig import Bundle,bones_global
from bind_unrigged_mesh import graft,validate_unrigged_target
from make_unrigged_qa_fixture import make_fixture
from verify_prototype import verify
from verify_fit_foot_contact import verify_fit_contact

HERE=Path(__file__).resolve().parent
SOURCE=Path(__import__('os').environ.get('AIG_PHASE10_SOURCE_GLB',HERE/'source-Phase6-NOT-APPROVED.glb'))
class TestUnriggedMeshAdapter(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory();cls.d=Path(cls.tmp.name)
        cls.target=cls.d/'unrigged.glb';cls.anchors=cls.d/'3d-anchors.json';cls.out=cls.d/'bound.glb'
        make_fixture(SOURCE,cls.target,cls.anchors)
        cls.info=graft(SOURCE,cls.target,cls.anchors,cls.out)
        cls.before=Bundle(cls.target);cls.after=Bundle(cls.out)
    @classmethod
    def tearDownClass(cls):cls.tmp.cleanup()
    def test_input_is_actually_independent_unrigged(self):
        self.assertEqual(len(self.before.g['skins']),0)
        self.assertEqual(len(self.before.g['animations']),0)
        self.assertTrue(all('JOINTS_0' not in p['attributes'] for m in self.before.g['meshes'] for p in m['primitives']))
        self.assertEqual(len(self.before.g['nodes']),195)
    def test_output_is_real_33_joint_skinned_glb(self):
        r=verify(self.out)
        self.assertTrue(r['valid_glTF2_technical'],r['errors'])
        self.assertEqual(len(self.after.g['skins'][0]['joints']),33)
        self.assertEqual(self.info['vertices'],48015)
        self.assertEqual(self.info['primitives'],195)
    def test_all_original_vertex_positions_preserved_binary_identical(self):
        for a,b in zip(self.before.g['meshes'],self.after.g['meshes']):
            for x,y in zip(a['primitives'],b['primitives']):
                self.assertEqual(self.before.read(x['attributes']['POSITION']).tobytes(),
                                 self.after.read(y['attributes']['POSITION']).tobytes())
                self.assertEqual(x['attributes']['POSITION'],y['attributes']['POSITION'])
        self.assertTrue(self.info['meshPosUntouched'])
    def test_pbr_materials_and_images_are_untouched(self):
        self.assertEqual(self.before.g['materials'],self.after.g['materials'])
        self.assertEqual(self.before.g['textures'],self.after.g['textures'])
        self.assertEqual(self.before.g['images'],self.after.g['images'])
        self.assertEqual(len(self.after.g['images']),9)
    def test_retarget_uses_target_anchors_not_old_bone_lengths(self):
        after=bones_global(self.after.g,self.after.g['skins'][0]['joints'])
        src=Bundle(SOURCE);orig=bones_global(src.g,src.g['skins'][0]['joints'])
        for n in ('Head','Hips','LeftFoot','RightFoot','LeftArm'):
            np.testing.assert_allclose(after[n],orig[n]*.78,atol=5e-8)
    def test_rest_pose_bind_inverse_poses_cancel(self):
        g=self.after.g;skin=g['skins'][0];pos=bones_global(g,skin['joints']);
        ms=self.after.read(skin['inverseBindMatrices'])
        for k,j in enumerate(skin['joints']):
            n=g['nodes'][j]['name'];t=np.eye(4);t[:3,3]=pos[n];inv=ms[k].reshape((4,4),order='F')
            np.testing.assert_allclose(t@inv,np.eye(4),atol=1e-6)
    def test_real_animation_and_foot_joint_contact_not_shoe(self):
        self.assertTrue(self.info['animation']['uniformSimilarity'])
        self.assertGreaterEqual(len(self.after.g.get('animations',[])),2)
        self.assertEqual(verify_fit_contact(self.out)['status'],'JOINT_CONTACT_PASS_NOT_SHOE_CONTACT')
        self.assertTrue(self.info['animation']['facialMorphClipsNotTransferred'])
    def test_target_morph_targets_preserved_but_not_falsely_animated(self):
        morphs=[m.get('extras',{}).get('targetNames',[]) for m in self.after.g['meshes']]
        self.assertIn(['Blink','Smile'],morphs)
        self.assertFalse(any(ch['target']['path']=='weights' for a in self.after.g['animations'] for ch in a['channels']))
    def test_unknown_target_sha_rejected(self):
        d=json.loads(self.anchors.read_text());d['targetMeshSHA256']='0'*64
        p=self.d/'badsha.json';p.write_text(json.dumps(d))
        with self.assertRaisesRegex(ValueError,'target mesh SHA mismatch'):
            graft(SOURCE,self.target,p,self.d/'badsha.glb')
    def test_wrong_authority_rejected(self):
        d=json.loads(self.anchors.read_text());d['reverseAuthoritySHA256']='f'*64
        p=self.d/'badref.json';p.write_text(json.dumps(d))
        with self.assertRaisesRegex(ValueError,'reverse Authority SHA mismatch'):
            graft(SOURCE,self.target,p,self.d/'badref.glb')
    def test_pixel_landmarks_rejected(self):
        d=json.loads(self.anchors.read_text());d['sourceLandmarks']='2D_IMAGE_PIXELS'
        p=self.d/'pixel.json';p.write_text(json.dumps(d))
        with self.assertRaisesRegex(ValueError,'2D pixels'):
            graft(SOURCE,self.target,p,self.d/'pixel.glb')
    def test_approval_cannot_be_laundered_through_tech_binder(self):
        d=json.loads(self.anchors.read_text());d['visualApproval']='APPROVED'
        p=self.d/'fake.json';p.write_text(json.dumps(d))
        with self.assertRaisesRegex(ValueError,'never authorizes visual release'):
            graft(SOURCE,self.target,p,self.d/'fake.glb')
        self.assertFalse(self.after.g['extras']['AIGSchool3DProvenance']['homepageAllowed'])
    def test_source_rig_mesh_rejected_as_unrigged(self):
        with self.assertRaisesRegex(ValueError,'must be unrigged'):
            validate_unrigged_target(Bundle(SOURCE).g)
    def test_bad_skeleton_landmark_shape_rejected(self):
        d=json.loads(self.anchors.read_text());d['3dJointPositionsUnitless']['Head']=[0,1]
        p=self.d/'badjoint.json';p.write_text(json.dumps(d))
        with self.assertRaisesRegex(ValueError,'invalid 3D joint'):
            graft(SOURCE,self.target,p,self.d/'badjoint.glb')
    def test_nonuniform_limb_changes_block_walk(self):
        d=json.loads(self.anchors.read_text())
        for key,pt in d['3dJointPositionsUnitless'].items():
            pt[0]*=.74
        p=self.d/'nonuniform.json';p.write_text(json.dumps(d))
        out=self.d/'nonuniform.glb'
        result=graft(SOURCE,self.target,p,out)
        self.assertFalse(result['animation']['uniformSimilarity'])
        self.assertTrue(result['animation']['blockedForIKRetarget'])
        self.assertFalse(Bundle(out).g['extras']['AIGSchool3DProvenance']['IKplaybackAllowed'])
    def test_determinism(self):
        other=self.d/'rebound-again.glb'
        r=graft(SOURCE,self.target,self.anchors,other)
        self.assertEqual(hashlib.sha256(other.read_bytes()).hexdigest(),self.info['sha256'])
        self.assertEqual(r['sha256'],self.info['sha256'])
if __name__=='__main__':unittest.main()