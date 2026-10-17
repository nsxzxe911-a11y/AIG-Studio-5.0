#!/usr/bin/env python3
import hashlib
import json
import struct
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CONTRACT=ROOT/'design/ui/authority/current-approved-home.json'

def png_size(path:Path):
    data=path.read_bytes()[:24]
    if len(data)<24 or data[:8]!=b'\x89PNG\r\n\x1a\n' or data[12:16]!=b'IHDR':
        raise AssertionError(f'AUTHORITY_NOT_PNG:{path}')
    return struct.unpack('>II',data[16:24])

def main():
    doc=json.loads(CONTRACT.read_text(encoding='utf-8'))
    assert doc['approvalState']=='USER_APPROVED_RECOVERED', 'HOME_AUTHORITY_APPROVAL_INVALID'
    assert doc['binaryIngest']=='VERIFIED', f"HOME_AUTHORITY_BINARY_NOT_VERIFIED:{doc['binaryIngest']}"
    for platform in ('mobile','desktop'):
        item=doc[platform]
        path=ROOT/item['file']
        assert path.is_file(), f'HOME_AUTHORITY_BINARY_MISSING:{platform}:{path}'
        size=path.stat().st_size
        assert size==item['bytes'], f'HOME_AUTHORITY_BYTE_SIZE_MISMATCH:{platform}:{size}'
        digest=hashlib.sha256(path.read_bytes()).hexdigest()
        assert digest==item['sha256'], f'HOME_AUTHORITY_SHA_MISMATCH:{platform}:{digest}'
        width,height=png_size(path)
        assert (width,height)==(item['width'],item['height']), f'HOME_AUTHORITY_DIMENSIONS_MISMATCH:{platform}:{width}x{height}'
    app=(ROOT/'app/src/main/java/com/aigstudio/app/AigStudioApplication.kt').read_text(encoding='utf-8')
    assert 'AIG RGB HOME AUTHORITY APPLIED' in app, 'ANDROID_AUTHORITY_APPLIED_MARKER_MISSING'
    assert 'HOME 416 warning; current HOME continues' not in app, 'ENGINEERING_SHELL_FALLBACK_STILL_ALLOWED'
    visual=(ROOT/'ci/verify_android_offline_rgb_home.sh').read_text(encoding='utf-8')
    assert 'AIG RGB HOME AUTHORITY APPLIED' in visual, 'VISUAL_GATE_AUTHORITY_MARKER_MISSING'
    assert 'AIG RGB HOME AUTHORITY MISSING' in visual, 'VISUAL_GATE_MISSING_AUTHORITY_REJECTION_MISSING'
    print('CURRENT_HOME_AUTHORITY_GATE_PASS|MOBILE|DESKTOP|USER_APPROVED|BINARY|SHA|DIMENSIONS|NO_ENGINEERING_SHELL_FALLBACK')

if __name__=='__main__':
    main()
