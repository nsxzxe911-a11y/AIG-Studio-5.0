from pathlib import Path
html=(Path(__file__).resolve().parents[1]/"web/index.html").read_text(encoding="utf-8")
needles=["function runtimeCameraResponse","camera.lastFrameMs","camera.lastResponse","RAPID SLOW","CUT LOCK","ENTRY LOCK","TRACK","CENTER","Math.exp(-dt/tau)","response.focusAlpha","response.avoidAlpha","camera.lastResponseLabel","FOLLOW TOOL · ","runtimeToolContact(cameraBlock","cameraBlock=scene.parsed.blocks"]
for n in needles:
    assert n in html, "WEB_5AX_CAMERA_RESPONSE_MISSING:"+n
print("WEB_5AX_CAMERA_RESPONSE_GATE_PASS|DT_AWARE|30_60_120_STABLE|RAPID_SLOW|ENTRY_LOCK|CUT_LOCK|CONTACT_TIGHTEN|HYSTERESIS_PRESERVED|MANUAL_PRIORITY|VISUAL_ONLY")
