"""QA: source image reference is not silently relabeled a 3D reconstruction."""
import json, os, tempfile, unittest, sys
from pathlib import Path
from PIL import Image
sys.path.insert(0,str(Path(__file__).parent))
from reverse_authority import create,REGIONS

HERE=Path(__file__).resolve().parents[1]
SOURCE=Path(os.environ.get('AIG_SCHOOL_APPROVED_STILL',HERE/'approved-still.png'))
MANIFEST=(HERE/'reverse-authority.v1.json' if (HERE/'reverse-authority.v1.json').exists() else HERE/'authority'/'reverse-authority.json')

class ReverseAuthorityTests(unittest.TestCase):
 def test_manifest_and_approval_guard(self):
  m=json.loads(MANIFEST.read_text('utf8'))
  self.assertEqual(m['source']['sha256'],'83b5728f34f6d3cc266d33e17fe259c44314b265fbf24d6d7a8eb971c316e910')
  self.assertEqual(len(m['regionRectangles']),9)
  self.assertFalse(m['releasedToHomepage'])
  self.assertEqual(m['reverseGate'],'REFERENCE_EXTRACTED_ONLY_NOT_3D_MODEL')
  self.assertTrue(m['noFake3D'])
  self.assertGreaterEqual(len(m['unobservableFromSingleImage']),8)
  self.assertEqual(m['source']['status'],'CINEMATIC_IMAGE_REFERENCE_NOT_APPROVED_AS_3D')
 def test_hair_pigment_not_background_sky(self):
  m=json.loads(MANIFEST.read_text('utf8'))
  r,g,b=m['colorSamples']['hair_base']['rgb']
  self.assertTrue(r<125 and g<110 and b<120,(r,g,b))
  for x in m['colorSamples'].values():
   self.assertEqual(len(x['source_xy']),2)
 def test_crops_have_original_pixel_coordinates(self):
  m=json.loads(MANIFEST.read_text('utf8'))
  for name,record in m['regionRectangles'].items():
   x1,y1,x2,y2=record['xyxy'];self.assertGreater(x2,x1);self.assertGreater(y2,y1)
   self.assertLessEqual(x2,m['source']['width']);self.assertLessEqual(y2,m['source']['height'])
   c=HERE/'authority'/(name+'.png')
   if c.exists():
    with Image.open(c) as cropped: self.assertEqual(cropped.size,(x2-x1,y2-y1))
 def test_regenerating_exact_image_when_available(self):
  if not SOURCE.exists():self.skipTest('Exact Authority pixels not installed; source generation not run by CI')
  with tempfile.TemporaryDirectory() as p:
   d=create(SOURCE,p)
   self.assertEqual(d['source']['sha256'],json.loads(MANIFEST.read_text('utf8'))['source']['sha256'])
   self.assertEqual(set(d['regionRectangles']),set(REGIONS))
if __name__=='__main__':unittest.main()