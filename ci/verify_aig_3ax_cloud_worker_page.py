#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / 'web' / '3d-worker.html'


def main():
    assert PAGE.is_file(), 'AIG_3AX_CLOUD_WORKER_PAGE_MISSING'
    s = PAGE.read_text(encoding='utf-8')
    required = [
        'AIG 3AX Cloud 3D Worker',
        'uiux/assets/axis3.jpg',
        'tur-learning/TRELLIS',
        '/image_to_glb',
        'Client.connect',
        'handle_file',
        'EXTERNAL_AI_CANDIDATE',
        'runtimeCompatible=false',
        'pivotsInjected=false',
        'axisDirectionVerified=false',
        '4f46a4c1f1ed7c71165108ed13f4809201794c16ebc397987d06d1be1f773e28',
        '@google/model-viewer@4.4.0',
    ]
    for token in required:
        assert token in s, f'AIG_3AX_CLOUD_WORKER_REQUIRED_TOKEN_MISSING:{token}'
    forbidden = ['4AX', '5AX', '6AX', 'MODEL_VISUAL_PASS', 'RUNTIME_PASS', 'contents: write']
    for token in forbidden:
        assert token not in s, f'AIG_3AX_CLOUD_WORKER_CAPABILITY_OR_FAKE_PASS:{token}'
    assert '<input type="file"' in s, 'AIG_3AX_CLOUD_WORKER_FILE_INPUT_MISSING'
    assert 'download' in s and '.glb' in s, 'AIG_3AX_CLOUD_WORKER_GLB_DOWNLOAD_MISSING'
    print('AIG_3AX_CLOUD_WORKER_PAGE_PASS|AIG=3AX_ONLY|RAW_CANDIDATE_ONLY')


if __name__ == '__main__':
    main()
