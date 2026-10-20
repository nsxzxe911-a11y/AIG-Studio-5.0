"""CI: synthetic 1672×941 reference fixture only. Does NOT claim visual Authority."""
import hashlib,importlib.util,json,struct,tempfile,unittest,zlib
from pathlib import Path
HERE=Path(__file__).resolve().parent
root=HERE.parent
m=importlib.util.spec_from_file_location('b',HERE/'build_envelope.py')
b=importlib.util.module_from_spec(m);m.loader.exec_module(b)

def png_solid(w,h):
    def chunk(name,data):return struct.pack('>I',len(data))+name+data+struct.pack('>I',zlib.crc32(name+data)&0xffffffff)
    raw=b''.join(b'\x00'+bytes((180,185,200))*w for _ in range(h))
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')

class TestStandaloneEnvelope(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
    cls.tmp=tempfile.TemporaryDirectory();d=Path(cls.tmp.name)
    cls.img=d/'synthetic-PROHIBITED-AS-AUTHORITY.png';cls.img.write_bytes(png_solid(1672,941))
    cls.spec=json.loads((root/'mesh-envelope.v1.json').read_text(encoding='utf8'))
    cls.real_sha=cls.spec['source']['sha256']
    cls.spec['source']['sha256']=hashlib.sha256(cls.img.read_bytes()).hexdigest()
    cls.specfile=d/'fixture.json';cls.specfile.write_text(json.dumps(cls.spec),encoding='utf8')
    cls.glb=d/'synthetic-qa-NOT-AUTHORITY.glb'
    cls.report=b.build(cls.img,cls.glb,cls.specfile)
    buf=cls.glb.read_bytes();jlen,tag=struct.unpack_from('<II',buf,12)
    cls.doc=json.loads(buf[20:20+jlen])
 @classmethod
 def tearDownClass(cls):cls.tmp.cleanup()
 def test_polygon_hierarchy_no_legacy_bulky_doll(self):
    self.assertFalse(self.spec['legacyDollGeometryUsed'])
    self.assertIsNone(self.spec['skeleton']['physicalBoneRadius'])
    self.assertEqual(len(self.spec['skeleton']['joints']),7)
 def test_synthetic_reference_is_not_original_authority(self):
    self.assertNotEqual(self.report['sourceImageSHA256'],self.real_sha)
 def test_zero_image_x_y_rest_error(self):
    self.assertEqual(self.report['maxReferenceMeshMoveInRest'],0)
 def test_technical_mesh_is_real_glb2(self):
    self.assertGreater(self.report['triangles'],9000)
    self.assertEqual(len(self.doc['meshes']),18)
    self.assertEqual(len(self.doc['skins']),1)
 def test_three_3d_rotation_tracks(self):
    self.assertEqual(len(self.doc['animations']),3)
    self.assertEqual([v['name'] for v in self.doc['animations']],['Head_Turn_2_5D_Technical','Left_Shoulder_Turn_Technical','Right_Shoulder_Turn_Technical'])
 def test_real_skin_weights_per_region(self):
    for r in self.spec['regions']:
      for p in r['polygon']:
        _,w=b.rig_weight(p,r['id'],self.spec)
        self.assertAlmostEqual(sum(w),1.0)
 def test_reject_altered_source_png(self):
    with tempfile.TemporaryDirectory() as d:
      changed=Path(d)/'altered.png';changed.write_bytes(self.img.read_bytes()+b'bad')
      with self.assertRaisesRegex(ValueError,'REVERSE_AUTHORITY_SHA_MISMATCH'):
       b.build(changed,Path(d)/'bad.glb',self.specfile)
 def test_source_approval_stays_blocked(self):
    self.assertFalse(self.doc['extras']['releaseAllowed'])
    self.assertFalse(self.doc['extras']['isFinalGirl'])
    self.assertFalse(self.doc['extras']['cameraCalibrated'])
 def test_no_observed_rear_mesh_claim(self):
    self.assertTrue(self.spec['mesh']['shellBackIsEstimated'])
    self.assertFalse(self.spec['depthMeasuredFromImage'])
 def test_consistent_export(self):
    with tempfile.TemporaryDirectory() as d:
      r=b.build(self.img,Path(d)/'again.glb',self.specfile)
      self.assertEqual(r['glbSHA256'],self.report['glbSHA256'])
if __name__=='__main__': unittest.main()