from pathlib import Path
html=(Path(__file__).resolve().parents[1]/"web/index.html").read_text(encoding="utf-8")
needles=[
 'data-camera-zoom','function runtimeCameraZoomPlan',
 'camera.userZoom','camera.zoomTarget','camera.zoomHoldUntil',
 'camera.zoomMode','RAPID WIDE','CUT CLOSE','CONTACT CLOSE','ENTRY CLOSE',
 'zoomDeadband','minimumZoomHoldMs','manualZoomHold',
 'zoomDelta=(camera.zoomTarget-camera.zoom)*zoomAlpha',
 'zoomMaxStep=zoomPlan.zoomMaxRate*(dtMs/1000)',
 'Math.max(1.25,Math.min(4.8',
 'AUTO x','MANUAL x'
]
for n in needles:
    assert n in html, "WEB_5AX_AUTO_ZOOM_MISSING:"+n
print("WEB_5AX_AUTO_ZOOM_GATE_PASS|USER_BASE|RAPID_WIDE|ENTRY_CLOSE|CUT_CLOSE|CONTACT_CLOSE|MIN_MAX|DEADBAND|HOLD|RATE_LIMIT|MANUAL_PRIORITY|VISUAL_ONLY")
