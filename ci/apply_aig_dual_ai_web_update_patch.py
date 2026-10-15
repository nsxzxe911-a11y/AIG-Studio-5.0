from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
path=ROOT/'core/src/main/kotlin/com/aigstudio/core/RollingUpdatePolicy.kt'
text=path.read_text(encoding='utf-8')
old='    const val NO_IN_PLACE_OVERWRITE=true\n'
new=(old+
     '    const val DESKTOP_COMMANDER_REQUIRED=false\n'
     '    const val UPDATE_DELIVERY_CHANNEL="AIG_WEB"\n'
     '    const val AIG_WEB_DOWNLOAD_URL="https://aig-studio-rgb-runtime.onrender.com/updates/"\n')
if text.count(old)!=1:
    raise SystemExit('POLICY_PATCH_ANCHOR_INVALID')
path.write_text(text.replace(old,new,1),encoding='utf-8')
print('AIG_STUDIO_WEB_UPDATE_POLICY_PATCHED')
