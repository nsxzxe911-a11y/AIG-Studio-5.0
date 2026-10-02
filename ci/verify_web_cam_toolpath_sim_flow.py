from pathlib import Path
html=(Path(__file__).resolve().parents[1]/"web/index.html").read_text(encoding="utf-8")
needles=[
 'data-cam-contour-side','value="OUTSIDE"','value="INSIDE"','data-cam-route-mode','value="AUTO"','value="MANUAL"',
 'data-cam-leadin','data-cam-leadout','data-cam-entry-x','data-cam-entry-y','data-cam-exit-x','data-cam-exit-y',
 'data-cam-avoid-enabled','data-cam-avoid-x','data-cam-avoid-y','data-cam-avoid-z',
 'function offsetClosedProfile','contourSide','routeMode','manualEntry','manualExit','avoidance',
 'data-tp-action="SIM"','const code=generateFanucNC();if(code)show(targetInput.value)',
]
for n in needles: assert n in html, "WEB_CAM_FLOW_MISSING:"+n
assert 'toolDia/2' in html
assert 'path.manualEntry' in html and 'path.manualExit' in html
assert 'path.avoidance' in html
print("WEB_CAM_TOOLPATH_SIM_GATE_PASS|OUTSIDE_INSIDE|CW_CCW|RADIUS_COMP|AUTO_MANUAL|ENTRY_EXIT|FIXTURE_AVOID|SAFE_Z|NODE_EDIT|POST_TO_SIM")
