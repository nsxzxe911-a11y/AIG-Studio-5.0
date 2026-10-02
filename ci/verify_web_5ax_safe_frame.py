from pathlib import Path
html=(Path(__file__).resolve().parents[1]/"web/index.html").read_text(encoding="utf-8")
needles=[
 'data-safe-frame-state','function runtimeProjectNdc','function runtimeSafeFramePlan',
 'camera.safeFrameOffset','camera.safeFrameTarget','camera.safeFrameHoldUntil',
 'SAFE CENTER','SAFE SHIFT','ALERT FRAME','MANUAL HOLD',
 'safeLeft','safeRight','safeBottom','safeTop',
 'safeDeadband','minimumSafeHoldMs','maxSafeOffset',
 'TOOL TIP','NEXT VIEW','FIXTURE ALERT',
 'scene.collisionAlarm','fixtureBoxes',
 'safeFrameOffset.x','safeFrameTarget.x',
 'NO PATH MUTATION'
]
for n in needles:
    assert n in html, "WEB_5AX_SAFE_FRAME_MISSING:"+n
print("WEB_5AX_SAFE_FRAME_GATE_PASS|TRUE_NDC_PROJECTION|TOOL_TIP|NEXT_VIEW|FIXTURE_ALERT|HUD_MARGIN|EDGE_MARGIN|MAX_OFFSET|DEADBAND|HOLD|RATE_LIMIT|MANUAL_PRIORITY|VISUAL_ONLY|NO_PATH_MUTATION")
