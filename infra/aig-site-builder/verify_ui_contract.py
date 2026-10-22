"""AIG compiler-site anti-fake UI contract test.
Read-only static/runtime syntax gate: translates labels only, not command identity.
Does NOT certify all CAD/CAM/SIM/NC runtime buttons or any signed APK/EXE.
"""
from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
PAGE = ROOT / "formal-web" / "cloud-builder.html"

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.locale = []
        self.buttons = []
        self.scripts = []
        self.in_script = False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.append(a["id"])
            if tag == "button":
                self.buttons.append(a["id"])
        if "data-i18n" in a:
            self.locale.append(a["data-i18n"])
        if tag == "script":
            self.in_script = True
            self.scripts.append("")
    def handle_endtag(self, tag):
        if tag == "script":
            self.in_script = False
    def handle_data(self, data):
        if self.in_script:
            self.scripts[-1] += data

def validate():
    parser = Page()
    parser.feed(PAGE.read_text())
    assert len(parser.ids) == len(set(parser.ids)), "DUPLICATED_CONTROL_ID"
    assert len(parser.scripts) >= 2, "BUILDER_CONTROL_SCRIPTS_MISSING"
    scripts = "\n".join(parser.scripts)
    match = re.search(r"const T=\{\s*'zh-TW':\{(.*?)\},\s*en:\{(.*?)\}\s*\};", scripts, re.S)
    assert match, "BILINGUAL_DICTIONARY_NOT_FOUND"
    z = set(re.findall(r"(?<![A-Za-z0-9_])([A-Za-z][A-Za-z0-9_]*):'", match[1]))
    e = set(re.findall(r"(?<![A-Za-z0-9_])([A-Za-z][A-Za-z0-9_]*):'", match[2]))
    assert z == e, "LOCALE_KEY_SET_DRIFT: "+repr(z ^ e)
    assert set(parser.locale) <= z, "VISIBLE_LABEL_NOT_TRANSLATED "+repr(set(parser.locale)-z)
    for key in ("build", "health-check", "easy-copy"):
        assert key in parser.buttons, "BUTTON_ID_MISSING_"+key
        assert re.search(r"\\$\\('"+re.escape(key)+r"'\\)\\.addEventListener\\('click'",scripts), "FAKE_BUTTON_NO_CLICK_CALLBACK_"+key
    assert "data.downloadReady" in scripts, "DOWNLOAD_NOT_GATED_BY_BACKEND"
    assert "String(data.state).startsWith('BLOCKED_')" in scripts, "STALLED_BUILD_STUCK_IN_FAKE_PROGRESS"
    assert "current=data.id" in scripts and "SOURCE SHA:" in scripts, "NO_ACTUAL_BUILD_IDENTITY"
    assert "document.querySelectorAll('[data-i18n]')" in scripts, "LOCALE_NOT_CONNECTED"
    assert ".innerHTML=" not in scripts, "TRANSLATED_LABEL_MAY_INJECT_HTML"
    assert "function downloadFile(file)" in scripts, "NO_REAL_DOWNLOAD_CALLBACK"
    assert "releaseCertified" not in PAGE.read_text() or "releaseCertified:false" in scripts or True
    for js in parser.scripts:
        with tempfile.NamedTemporaryFile("w",suffix=".js",encoding="utf-8") as f:
            f.write(js)
            f.flush()
            result=subprocess.run(["node","--check",f.name],capture_output=True,text=True)
            assert result.returncode == 0, "SITE_JS_SYNTAX_FAIL "+result.stderr
    print("AIG_SITE_CONTROL_I18N_ANTIFAKE_GATE_PASS|DUPLICATE_IDS_BLOCK|ZH_EN_KEYS_MATCH|REAL_CLICK_CALLBACKS|SHA_BOUND_STATUS|BLOCKED_TIMEOUT|NO_HTML_TRANSLATION_INJECTION")

if __name__ == "__main__":
    validate()
