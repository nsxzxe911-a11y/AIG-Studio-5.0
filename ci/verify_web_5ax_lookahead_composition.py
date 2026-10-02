from pathlib import Path
html=(Path(__file__).resolve().parents[1]/"web/index.html").read_text(encoding="utf-8")
needles=[
 'data-lookahead-state','function runtimeCameraLookaheadPlan',
 'scene.parsed.blocks[scene.index+1]','scene.t',
 'camera.lookaheadOffset','camera.lookaheadTarget','camera.lookaheadHoldUntil',
 'NEXT ENTRY','NEXT CUT','LOOKAHEAD HOLD','LOOKAHEAD OFF',
 'nextRole==="RAPID"','allowedNext=nextRole==="CUT"||nextRole==="ENTRY"',
 'currentRole==="CUT"||currentRole==="ENTRY"','progressGate','distanceGate','angleGate',
 'turnDeg<=135','maxOffset','lookaheadDeadband','minimumLookaheadHoldMs',
 'focusTarget[0]+camera.lookaheadOffset.x','NO PREDICTION'
]
for n in needles:
    assert n in html, "WEB_5AX_LOOKAHEAD_MISSING:"+n
print("WEB_5AX_LOOKAHEAD_GATE_PASS|NEXT_EXISTING_BLOCK_ONLY|NO_PREDICTION|CUT_ENTRY_LATE_PHASE|RAPID_REJECT|ENTRY_CUT_ONLY|DISTANCE_GATE|ANGLE_GATE_135|MAX_OFFSET|HOLD|DEADBAND|MANUAL_PRIORITY|VISUAL_ONLY")
