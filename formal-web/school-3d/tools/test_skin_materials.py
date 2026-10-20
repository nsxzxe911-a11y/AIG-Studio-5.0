"""Unit tests for procedural material maps: these do not approve skin's appearance."""
import unittest, tempfile, hashlib
from pathlib import Path
import numpy as np
from skin_materials import maps, generate

class MaterialTests(unittest.TestCase):
 def test_shapes_types_channels(self):
  for kind in ('skin','hair','fabric'):
   batch=maps(kind,128)
   self.assertEqual(set(batch),{'basecolor','metallicroughness','normal'})
   for a in batch.values():
    self.assertEqual(a.shape,(128,128,3));self.assertEqual(a.dtype,np.uint8)
   self.assertTrue((batch['metallicroughness'][:,:,2]==0).all(),'no metallic skin/hair/fabric')
   self.assertTrue((batch['normal'][:,:,2]>=127).all(),'Z normals must face out')
   self.assertGreater(float(np.std(batch['normal'][:,:,0])),.1,'normals must vary')
 def test_deterministic(self):
  a=maps('skin',128)['basecolor']; b=maps('skin',128)['basecolor']
  self.assertEqual(hashlib.sha256(a.tobytes()).hexdigest(),hashlib.sha256(b.tobytes()).hexdigest())
 def test_manifest_integrity(self):
  with tempfile.TemporaryDirectory() as tmp:
   manifest=generate(tmp,128)
   self.assertEqual(len(manifest['assets']),9)
   for name,meta in manifest['assets'].items():
    self.assertEqual(hashlib.sha256((Path(tmp)/name).read_bytes()).hexdigest(),meta['sha256'])
   self.assertIn('NOT_CHARACTER_AUTHORITY',manifest['classification'])

if __name__=='__main__':unittest.main()