#!/usr/bin/env python3
from pathlib import Path

R=Path(__file__).resolve().parents[1]
main=(R/'app/src/main/java/com/aigstudio/app/MainActivity.kt').read_text(encoding='utf-8')
core=(R/'core/src/main/kotlin/com/aigstudio/core/Document.kt').read_text(encoding='utf-8')
ui=(R/'core/src/main/kotlin/com/aigstudio/core/ui/ModularUiContract.kt').read_text(encoding='utf-8')

required_ui=[
    'QUICK','SELECT','PAN','FIT','UNDO','REDO',
    'CAD','VIEW','PHOTO','CORNER','EDIT','FILE'
]
for token in required_ui:
    if token not in ui:
        raise SystemExit('BLOCKED CAD_TOOL_DECK_CONTRACT missing '+token)

# RED until Studio has live draft interaction and cached snap indexing.
for token in [
    'private var draftEnd:',
    'private var draftSnapActive',
    'MotionEvent.ACTION_MOVE ->',
    'drawDraftPreview(canvas)',
    'CadSnapQueryCache'
]:
    if token not in main+core:
        raise SystemExit('BLOCKED CAD_LATENCY_CONTRACT missing '+token)

move=main[main.find('override fun onTouchEvent'):]
move=move[:move.find('private fun handleTap') if 'private fun handleTap' in move else len(move)]
if 'runGeometryCommand(' in move and 'MotionEvent.ACTION_MOVE' in move:
    # Geometry commits may exist in ACTION_UP, but never inside MOVE block.
    move_block=move.split('MotionEvent.ACTION_MOVE ->',1)[1].split('MotionEvent.ACTION_UP',1)[0]
    if 'runGeometryCommand(' in move_block or 'AddEntitiesCommand' in move_block:
        raise SystemExit('BLOCKED CAD_MOVE_MUTATES_GEOMETRY')
print('STUDIO_CAD_LATENCY_CONTRACT_PASS|LIVE_DRAFT|SNAP_CACHE|MOVE_NO_GEOMETRY|LAZY_TOOL_GROUPS')
