from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'app/src/main/java/com/aigstudio/app'

def fail(code): raise SystemExit('PRO_SURFACE_BIND_FAIL|'+code)
def need(ok,code):
    if not ok: fail(code)
def read(path):
    p=ROOT/path
    need(p.exists(),'MISSING_'+str(path).replace('/','_'))
    return p.read_text(encoding='utf-8',errors='replace')

installer_path=APP/'ProfessionalSurfaceSkinInstaller.kt'
need(installer_path.exists(),'INSTALLER_MISSING')
installer=installer_path.read_text(encoding='utf-8',errors='replace')
app=read('app/src/main/java/com/aigstudio/app/AigStudioApplication.kt')
main=read('app/src/main/java/com/aigstudio/app/MainActivity.kt')
axis=read('app/src/main/java/com/aigstudio/app/AxisCockpitSkinInstaller.kt')

need('ProfessionalSurfaceSkinInstaller.install(activity)' in app,'APPLICATION_NOT_BOUND')
need('HomeRgbAsset.load(activity)' not in app,'OLD_STARTUP_AS_HOME_BINDING')
need('AIG CNC FORMAL RGB HOME' in installer,'HOME_MARKER')
need('UX •' in installer,'MODE_MARKER')
for token in ('HOME_VISUAL','CAD_VISUAL','CAM_VISUAL','SIM_VISUAL','AXIS3_VISUAL','AXIS4_VISUAL','AXIS5_VISUAL'):
    need(token in installer,'VISUAL_'+token)
need('PROCEDURAL_RGB_GLASS' in installer,'SIX_AXIS_PROCEDURAL')
need('setOnClickListener' not in installer,'INSTALLER_MUST_NOT_REPLACE_CALLBACKS')
need('setOnTouchListener' not in installer,'INSTALLER_MUST_NOT_REPLACE_TOUCH')
need('contentDescription="UI $normalized"' in main,'REAL_UI_NAV_CALLBACK_MARKER')
need('action()' in main,'REAL_UI_ACTION_CALLBACK')
need('mode in setOf("3AX","4AX","5AX","6AX")' in axis,'LIVE_AXIS_MODES')
need('progressiveFrame' in axis and 'axisA' in axis and 'axisB' in axis and 'axisC' in axis,'LIVE_6AX_STATE')
need('axis5.jpg' not in installer.split('"6AX"',1)[-1][:500],'NO_5AX_RASTER_FOR_6AX')

print('PRO_SURFACE_BIND_PASS|STUDIO_372|VISUAL_ONLY_INSTALLER|REAL_CALLBACKS|LIVE_3_TO_6AX|NO_FAKE_6AX')
