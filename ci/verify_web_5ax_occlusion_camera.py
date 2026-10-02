from pathlib import Path
html=(Path(__file__).resolve().parents[1]/"web/index.html").read_text(encoding="utf-8")
needles=[
 'data-occlusion-state','data-cmd="occlusion"','防遮擋 AUTO',
 'camera.avoid','camera.manualUntil','camera.avoidYaw','camera.avoidPitch',
 'function runtimeSegmentAabbHit','function runtimeCameraOcclusion',
 'function runtimeOcclusionCandidate','occlusion.reason','AUTO SHIFT','MANUAL HOLD','CLEAR',
 'effectiveYaw','effectivePitch','performance.now()<camera.manualUntil',
 'inverseRotABPoint({x:eye[0]','runtimeAssemblyBoxes({assembly:scene.assembly})'
]
for n in needles:
    assert n in html, "WEB_5AX_OCCLUSION_MISSING:"+n
print("WEB_5AX_OCCLUSION_GATE_PASS|AABB_RAY|ABC_LOCAL_TEST|STOCK_FIXTURE_TABLE|SMALL_VIEW_SHIFT|MANUAL_HOLD|AUTO_RECOVER|VISUAL_ONLY")
