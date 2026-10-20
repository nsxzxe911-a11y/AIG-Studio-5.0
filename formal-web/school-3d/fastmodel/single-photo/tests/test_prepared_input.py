"""3.8 staging tests: only synthetic sources, zero paid provider calls."""
import io,sys,tempfile,unittest
from pathlib import Path
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from prepared_input import digest_file,verify_prepared_foreground

class PreparedForegroundTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.base=Path(self.temp.name)
        self.orig=self.base/'original.png' # deliberately misleading extension
        self.prep=self.base/'prepared.png'
        self.size=(40,60)
        im=Image.new('RGB',self.size,(90,130,170))
        im.save(self.orig,format='JPEG')
        with Image.open(self.orig) as j: src=j.convert('RGBA')
        for y in range(self.size[1]):
            for x in range(self.size[0]):
                src.putpixel((x,y),(*src.getpixel((x,y))[:3],255 if 8<=x<32 and 10<=y<55 else 0))
        src.save(self.prep,format='PNG')
    def verify(self):
        return verify_prepared_foreground(self.orig,self.prep,expected_hash=digest_file(self.orig),expected_size=self.size)
    def test_normalized_rgba_from_exact_jpeg_is_input_only_not_a_glb(self):
        a=self.verify()
        self.assertEqual(a['mode'],'SOURCE_ANCHORED_FOREGROUND_DRAFT')
        self.assertTrue(a['manualMatteApprovalRequired'])
        self.assertFalse(a['real3DModelProduced'])
        self.assertEqual(a['originalSourceSHA256'],digest_file(self.orig))
        self.assertEqual(a['preparedSourceSHA256'],digest_file(self.prep))
        self.assertGreater(a['preparedAlphaVisibleFraction'],.1)
    def test_known_original_exact_SHA_is_mandatory(self):
        with self.assertRaisesRegex(ValueError,'PREPARED_NOT_OFFICIAL_HEROINE_ORIGINAL'):
            verify_prepared_foreground(self.orig,self.prep,expected_size=self.size)
    def test_opaque_generated_face_or_wrong_rgb_is_rejected(self):
        with Image.open(self.prep) as p:
            rgba=p.copy();rgba.putpixel((20,30),(255,10,10,255));rgba.save(self.prep)
        with self.assertRaisesRegex(ValueError,'PREPARED_FOREGROUND_PIXEL_MISMATCH'):self.verify()
    def test_alpha_and_size_fail_closed_without_touching_original(self):
        original_bytes=self.orig.read_bytes()
        Image.new('RGBA',self.size,(1,2,3,255)).save(self.prep)
        with self.assertRaisesRegex(ValueError,'PREPARED_ALPHA_COVERAGE_UNSAFE'):self.verify()
        Image.effect_noise((20,30),50).convert('RGBA').save(self.prep)
        with self.assertRaisesRegex(ValueError,'PREPARED_SIZE_OR_ALPHA_INVALID'):self.verify()
        self.assertEqual(self.orig.read_bytes(),original_bytes)

if __name__=='__main__':unittest.main()
