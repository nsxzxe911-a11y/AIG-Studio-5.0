from pathlib import Path
root=Path(__file__).resolve().parents[1]
def read(*parts):
    p=root.joinpath(*parts)
    return p.read_text(encoding="utf-8",errors="replace") if p.exists() else ""
web=read("web","index.html"); web6=read("web","6ax-ui.html"); combined=web+"\n"+web6
android=read("app","src","main","java","com","aigstudio","app","MainActivity.kt") or read("app","src","main","java","com","aigii","app","MainActivity.kt")
desktop=read("desktop","src","main","kotlin","com","aigstudio","desktop","DesktopApp.kt") or read("desktop","aigii","DesktopApp.kt")
if combined.strip():
    forbidden=[".aigIssueCenter.error{border-color:#7e2634",".fieldIssue.error{color:#ff8fa1","input.aigError,select.aigError,textarea.aigError{border-color:#a82d43",".field-invalid{border-color:var(--red)"]
    for token in forbidden: assert token not in combined,"GUIDANCE_UI_RED_ERROR_STYLE:"+token
    assert ".execLine.alarm" in web,"TRUE_ALARM_STYLE_MISSING"
    for token in ["aigShowGuidance","aigNavigateGuidance","AIG_GUIDANCE_TUTORIAL_MODE","帶我去調整","教學模式","建議值","影響"]:
        assert token in combined,"WEB_GUIDANCE_MISSING:"+token
assert "JOptionPane.ERROR_MESSAGE" not in desktop,"DESKTOP_RED_ERROR_DIALOG_FORBIDDEN"
for token in ["showGuidanceDialog","AIG_GUIDANCE_DIALOG","tutorialMode"]:
    assert token in desktop,"DESKTOP_GUIDANCE_MISSING:"+token
blocked=[line for line in android.splitlines() if "Toast.makeText" in line and "BLOCKED" in line]
assert not blocked,"ANDROID_BLOCKED_TOAST_FORBIDDEN:"+str(len(blocked))
for token in ["showGuidanceMessage","AIG_GUIDANCE_MESSAGE","tutorialMode","guidanceTarget"]:
    assert token in android,"ANDROID_GUIDANCE_MISSING:"+token
print("GUIDANCE_MESSAGE_UI_GATE_PASS|NO_RED_ORDINARY_ERRORS|AI_NAVIGATION|TUTORIAL_MODE|SUGGESTED_VALUE|IMPACT|TRUE_ALARM_PRESERVED")
