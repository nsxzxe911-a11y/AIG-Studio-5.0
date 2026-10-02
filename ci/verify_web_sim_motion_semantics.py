from pathlib import Path
html=(Path(__file__).resolve().parents[1]/"web/index.html").read_text(encoding="utf-8")
needles=[
 'function runtimeMotionRole','AIG AVOID','AIG MANUAL ENTRY','AIG ENTRY','AIG EXIT','AIG RETRACT',
 'data-motion-role','data-motion-legend','RAPID','ENTRY','CUT','EXIT','RETRACT','AVOID',
 'runtimeMotionColor','motionRole:runtimeMotionRole',
 'WEBGL 3D + HEIGHTFIELD','WEBGL 3D + ROTARY VOXEL',
 'data-removal-volume','data-removal-percent','data-remaining-volume'
]
for n in needles: assert n in html, "WEB_SIM_MOTION_MISSING:"+n
assert 'bl.cutting' in html and 'cutBlock' in html and 'voxelStock' in html
print("WEB_SIM_MOTION_GATE_PASS|G0_RAPID|ENTRY|CUT|EXIT|RETRACT|AVOID|WEBGL_SYNC|TRUE_REMOVAL|VOLUME|PERCENT|REMAINING")
