from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / 'templates' / 'control.html'


def test_formal_control_page_is_aig_web_update_migration_only():
    text = PAGE.read_text(encoding='utf-8')
    assert 'AIG 雙專案 AI 更新' in text
    assert 'https://aig-studio-rgb-runtime.onrender.com/updates/' in text
    assert 'CURRENT STABLE RETAINED' in text
    for forbidden in (
        'DESKTOP-6KOFHUK',
        'WINDOWS_AI_UPDATE',
        'DUAL_ANDROID_UPDATE',
        'RESUME_463',
        'NOX_STATUS',
        'NOX_START',
        'Controller token',
        'localStorage',
        '/api/agent/status/',
        '/api/commands',
    ):
        assert forbidden not in text, f'FORMAL_CONTROL_STILL_REMOTE:{forbidden}'
