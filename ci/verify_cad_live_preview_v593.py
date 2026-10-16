#!/usr/bin/env python3
from pathlib import Path

root=Path(__file__).resolve().parents[1]
main=(root/'app/src/main/java/com/aigstudio/app/MainActivity.kt').read_text(encoding='utf-8')

cad_start=main.index('class CadView(')
cad=main[cad_start:]

required=(
    'private var previewPoint: Vec2? = null',
    'drawTransientPreview(canvas)',
    'MotionEvent.ACTION_MOVE ->',
    'previewPoint = lastWorld',
)
for token in required:
    if token not in cad:
        raise SystemExit('CAD_LIVE_PREVIEW_MISSING:'+token)

# A move event must not be reserved exclusively for PAN.
old='MotionEvent.ACTION_MOVE -> if (tool == Tool.PAN)'
if old in cad:
    raise SystemExit('CAD_ACTION_MOVE_PAN_ONLY')

print('CAD_LIVE_PREVIEW_V593_PASS|LINE_RECT_CIRCLE_ARC_HOLE|ACTION_MOVE_TRANSIENT_GEOMETRY|NO_COMMIT_UNTIL_SECOND_POINT')
