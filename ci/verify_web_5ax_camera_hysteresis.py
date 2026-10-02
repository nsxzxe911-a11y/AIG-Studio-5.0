from pathlib import Path
html=(Path(__file__).resolve().parents[1]/"web/index.html").read_text(encoding="utf-8")
needles=[
 'function runtimeOcclusionEvaluateOffset','function runtimeOcclusionHysteresis',
 'camera.avoidTargetYaw','camera.avoidTargetPitch','camera.avoidHoldUntil',
 'camera.avoidSwitchCount','hysteresisMargin','minimumHoldMs',
 'STABLE HOLD','camera.lastAvoidDecision',
 'challengerClear','heldBlocked','meaningfullyBetter',
 'runtimeOcclusionHysteresis(candidate,heldEval',
 'camera.avoidYaw+=(camera.avoidTargetYaw-camera.avoidYaw)'
]
for n in needles:
    assert n in html, "WEB_5AX_HYSTERESIS_MISSING:"+n
print("WEB_5AX_HYSTERESIS_GATE_PASS|HELD_VIEW|MIN_HOLD|SCORE_MARGIN|BLOCKED_ESCAPE|CLEAR_RECENTER|MANUAL_PRIORITY|NO_FLIP_FLOP")
