from pathlib import Path
r=Path(__file__).resolve().parents[1]
p=(r/'app-production/src/main/java/com/aigstudio/production/CleanCadPanel.kt').read_text(encoding='utf-8')
s=(r/'production-runtime/src/main/kotlin/com/aigstudio/production/runtime/CleanCadSession.kt').read_text(encoding='utf-8')
b=(r/'app-production/build.gradle.kts').read_text(encoding='utf-8')
checks={
'VERSION_392':'com.aigstudio.production.clean392' in b and '392001' in b and '392-cad-corners' in b,
'HOLE_UI':'CAD TOOL HOLE' in p and 'session.addHole' in p,
'CHAMFER_UI':'CAD CHAMFER 5MM' in p and 'chamferSelected(5.0)' in p,
'FILLET_UI':'CAD FILLET R5MM' in p and 'filletSelected(5.0)' in p,
'ARC_DRAW':'CleanCadPrimitive.ArcShape' in p and 'drawArc' in p,
'HOLE_CORE':'CadSemanticIdentity.newHoleId()' in s and 'holeCount' in s,
'CORNER_CORE':'chamferCommand' in s and 'filletCommand' in s,
'NO_LEGACY_APP':'project(":app")' not in (r/'app-production/build.gradle.kts').read_text(encoding='utf-8')}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('CAD_CORNERS_392_FAIL|'+'|'.join(bad))
print('CAD_CORNERS_WIRING_PASS|AIG_CNC_392|HOLE|CHAMFER|FILLET|ARC_DRAW|NO_LEGACY_APP')
