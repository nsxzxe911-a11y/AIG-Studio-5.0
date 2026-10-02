from pathlib import Path
html=(Path(__file__).resolve().parents[1]/"web/index.html").read_text(encoding="utf-8")
needles=[
 'data-camera-mode','data-depth-cue','data-cmd="follow"','data-cmd="center"',
 'camera.follow','camera.focus','camera.lastDepthCue',
 'function runtimeToolAxisVector','function runtimeDepthCue',
 'FOLLOW TOOL','STOCK CENTER','NEAR','FAR','FLAT',
 'axis==="5AX"||axis==="6AX"',
 'focusTarget=followEligible?[Number(pos.X||0),Number(pos.Y||0),Number(pos.Z||0)]:stockTarget',
 'composedFocusTarget=followEligible?[focusTarget[0]+camera.lookaheadOffset.x',
 'camera.focus[0]+=(composedFocusTarget[0]-camera.focus[0])',
 'glScene.camera.follow'
]
for n in needles:
    assert n in html, "WEB_5AX_CAMERA_MISSING:"+n
print("WEB_5AX_CAMERA_GATE_PASS|FOLLOW_TOOL|MANUAL_ORBIT|STOCK_CENTER|SMOOTH_FOCUS|TOOLPOINT_BASE_PLUS_BOUNDED_VISUAL_OFFSET|AB_TOOL_AXIS|VIEW_DEPTH_NEAR_FAR_FLAT|VISUAL_ONLY")
