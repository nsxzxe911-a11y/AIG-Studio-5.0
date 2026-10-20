"""CI-safe test suite: synthetic fixtures only, never mislabel them as approved art."""
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from PIL import Image
import numpy as np
from phase11_projection_gate import PAIRINGS, load_inputs, fit_projection, weak_perspective, evaluate

class TestVisualGate(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.p=Path(self.temp.name)
        self.image=self.p/'synthetic.png'; Image.new('RGB',(1672,941),'#0a3b66').save(self.image)
        self.model=self.p/'technical.glb'; self.model.write_bytes(b'synthetic glb fake fixture')
        self.ref=self.p/'reverse.json'
        self.joints=self.p/'joint-anchors.json'
        names=[n for n,_ in PAIRINGS]
        self.points={n:{'xy':[100+i*55,100+i*42]} for i,n in enumerate(names)}
        self.points['crown']={'xy':[250,50]}
        self.points['chin']={'xy':[375,386]}
        self.manifest={
            'source':{'sha256':hashlib.sha256(self.image.read_bytes()).hexdigest(),'width':1672,'height':941},
            'estimatedVisibleKeypoints':self.points,
            'regionRectangles':{'primary_hero':{'xyxy':[0,0,1100,940]}},
        }
        self.anchors={
            'targetMeshSHA256':hashlib.sha256(self.model.read_bytes()).hexdigest(),
            'reverseAuthoritySHA256':self.manifest['source']['sha256'],
            'cameraCalibrated':False,'visualApproval':'NOT_APPROVED','allowedToPublish':False,
            'sourceLandmarks':'TECHNICAL_3D_UNITSPACE_NOT_2D_PIXELS',
            '3dJointPositionsUnitless':{b:[i*.065,1.45-i*.11,(-1)**i*.03] for i,(n,b) in enumerate(PAIRINGS)}
        }
        self.dump()
    def tearDown(self):self.temp.cleanup()
    def dump(self):
        self.ref.write_text(json.dumps(self.manifest),'utf-8');self.joints.write_text(json.dumps(self.anchors),'utf-8')
    def test_source_image_digest_enforced(self):
        m,a=load_inputs(self.ref,self.image,self.joints,self.model)
        self.assertEqual(m['source']['sha256'],a['reverseAuthoritySHA256'])
    def test_tampered_original_image_rejected(self):
        self.image.write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError,'Authority image SHA256'):load_inputs(self.ref,self.image,self.joints,self.model)
    def test_tampered_independent_model_rejected(self):
        self.model.write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError,'model SHA256'):load_inputs(self.ref,self.image,self.joints,self.model)
    def test_false_release_metadata_rejected(self):
        self.anchors['visualApproval']='APPROVED';self.anchors['allowedToPublish']=True;self.dump()
        with self.assertRaisesRegex(ValueError,'production-ready'):load_inputs(self.ref,self.image,self.joints,self.model)
    def test_2d_landmarks_not_3d(self):
        self.anchors['3dJointPositionsUnitless'].pop('Head',None)
        self.anchors['3dJointPositionsUnitless'].pop('LeftEye')
        self.dump()
        with self.assertRaisesRegex(ValueError,'Missing independent model-space joint'):load_inputs(self.ref,self.image,self.joints,self.model)
    def test_fitting_can_never_grant_visual_release(self):
        m,a=load_inputs(self.ref,self.image,self.joints,self.model)
        fit=fit_projection(m,a)
        self.assertEqual(len(fit['pairs']),8)
        self.assertFalse(fit['isRealCalibratedCamera'])
        self.assertFalse(fit['visualAuthorityPassed'])
        self.assertFalse(fit['releaseAllowed'])
        self.assertTrue(np.isfinite(fit['meanErrorPx']))
    def test_weak_perspective_returns_shape_and_finite(self):
        points=np.array([[1,2,3],[1.4,2.4,3.7]],float)
        r=weak_perspective(points,np.array([0,0,0,200,450,550],float))
        self.assertEqual(r.shape,(2,2));self.assertTrue(np.isfinite(r).all())
    def test_mismatched_reverse_hash_to_model_anchor_fails(self):
        self.anchors['reverseAuthoritySHA256']='0'*64;self.dump()
        with self.assertRaisesRegex(ValueError,'do not belong'):load_inputs(self.ref,self.image,self.joints,self.model)
    def test_unverified_camera_only(self):
        self.anchors['cameraCalibrated']=True;self.dump()
        with self.assertRaisesRegex(ValueError,'UNCALIBRATED'):load_inputs(self.ref,self.image,self.joints,self.model)
    def test_full_output_never_approved(self):
        report=self.p/'out.json';overlay=self.p/'out.jpg'
        f=evaluate(self.ref,self.image,self.joints,self.model,report,overlay,None)
        data=json.loads(report.read_text())
        self.assertFalse(f['releaseAllowed']);self.assertFalse(data['visualAuthorityPassed'])
        self.assertTrue(overlay.exists());self.assertEqual(data['candidateModelSHA256'],self.anchors['targetMeshSHA256'])

if __name__=='__main__':unittest.main()