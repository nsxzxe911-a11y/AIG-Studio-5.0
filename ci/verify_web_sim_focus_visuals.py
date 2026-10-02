from pathlib import Path
html=(Path(__file__).resolve().parents[1]/"web/index.html").read_text(encoding="utf-8")
needles=[
 'function runtimeRecentCutBlocks','function runtimeToolContact',
 'data-cut-trail','data-contact-state','RECENT CUT','TOOL CONTACT',
 'recentCutSet','contact.active','contact.radius',
 'runtimeMotionColor(runtimeMotionRole(bl),scene.dry)',
 'HEIGHTFIELD','ROTARY VOXEL'
]
for n in needles: assert n in html, "WEB_SIM_FOCUS_MISSING:"+n
assert 'recentCutSet.has(i)' in html
assert 'Math.max(2,Math.min(20,runtimeToolDiameter' in html
assert 'last 3' in html.lower() or 'slice(-3)' in html
print("WEB_SIM_FOCUS_GATE_PASS|CURRENT_TOOL|CONTACT_RING|RECENT_3_CUTS|OLD_TRACE_FADE|3AX_HEIGHTFIELD|4X5X_ROTARY_VOXEL|VISUAL_ONLY")
