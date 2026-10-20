"""FastModel 3.8: source-anchored RGBA foreground staging (not 3D generation).
The derived mask never replaces or becomes the approved original reference.
"""
import hashlib
from pathlib import Path
from PIL import Image, ImageChops, ImageOps

OFFICIAL_HEROINE_SHA256 = 'fbf47f32a844a80e1bb39cb23084527baaf1350427c20d2b49d21fdc453444d6'
OFFICIAL_SIZE = (1152, 1536)

def digest_file(path):
    with Path(path).open('rb') as f:
        return hashlib.file_digest(f,'sha256').hexdigest()

def verify_prepared_foreground(original_path, prepared_path, *, expected_hash=OFFICIAL_HEROINE_SHA256,
                               expected_size=OFFICIAL_SIZE):
    original_path, prepared_path = Path(original_path),Path(prepared_path)
    if not 0<original_path.stat().st_size<=20*1024*1024:raise ValueError('ORIGINAL_IMAGE_SIZE_INVALID')
    if not 100<prepared_path.stat().st_size<=20*1024*1024:raise ValueError('PREPARED_IMAGE_SIZE_INVALID')
    original_sha=digest_file(original_path)
    if original_sha!=expected_hash:raise ValueError('PREPARED_NOT_OFFICIAL_HEROINE_ORIGINAL')
    with Image.open(original_path) as source, Image.open(prepared_path) as cutout:
        if source.format!='JPEG' or cutout.format!='PNG':
            raise ValueError('PREPARED_REQUIRES_ORIGINAL_JPEG_AND_RGBA_PNG')
        original=ImageOps.exif_transpose(source).convert('RGB')
        if original.size!=expected_size or cutout.size!=expected_size or cutout.mode!='RGBA':
            raise ValueError('PREPARED_SIZE_OR_ALPHA_INVALID')
        alpha=cutout.getchannel('A')
        histogram=alpha.histogram(); pixels=expected_size[0]*expected_size[1]
        selected=sum(histogram[245:]);visible=sum(histogram[128:])
        transparent=sum(histogram[:32])
        if not .15<=selected/pixels<=.90 or transparent/pixels<.08:
            raise ValueError('PREPARED_ALPHA_COVERAGE_UNSAFE')
        # Some edge antialiasing is expected. Pixels with almost-full opacity
        # must be sourced from exactly the original JPEG, not generated faces.
        core_mask=alpha.point(lambda v: 255 if v>=245 else 0)
        diff=ImageChops.difference(original,cutout.convert('RGB'))
        diff=Image.composite(diff,Image.new('RGB',expected_size,(0,0,0)),core_mask)
        # A one-unit rounding deviation is harmless, but a relit face is not.
        extrema=diff.getextrema()
        if any(maxima>2 for _minima,maxima in extrema):
            raise ValueError('PREPARED_FOREGROUND_PIXEL_MISMATCH')
        return {
            'mode':'SOURCE_ANCHORED_FOREGROUND_DRAFT',
            'originalSourceSHA256':original_sha,
            'preparedSourceSHA256':digest_file(prepared_path),
            'preparedAlphaVisibleFraction':round(visible/pixels,5),
            'preparedAlphaOpaqueFraction':round(selected/pixels,5),
            'unseenGeometryInferred':True,
            'manualMatteApprovalRequired':True,
            'originalPhotoKept':True,
            'real3DModelProduced':False,
            'formalHeroineApproved':False
        }
