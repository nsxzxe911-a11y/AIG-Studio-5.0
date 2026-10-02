from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/"ci"/"local_android_build.py"
assert p.exists(),"LOCAL_ANDROID_BUILDER_MISSING"
s=p.read_text(encoding="utf-8")
needles=[
 "ANDROID_HOME","ANDROID_SDK_ROOT","LOCALAPPDATA",
 'API=36','BUILD_TOOLS="36.0.0"','f"android-{API}"',
 "apksigner","AIG_GRADLE","PROCESS_ENV_ONLY",
 "assembleDebug","--probe-only","sha256","local.properties",
 "NO_LOCAL_PROPERTIES_WRITE","ANDROID_SDK_ROOT"
]
for n in needles:
    assert n in s,"LOCAL_ANDROID_BUILDER_MISSING:"+n
assert "setx " not in s.lower(),"PERSISTENT_ENV_FORBIDDEN"
assert ".write_text(" not in s and ".write_bytes(" not in s,"REPO_MUTATION_FORBIDDEN"
print("LOCAL_ANDROID_BUILDER_GATE_PASS|API36|BUILD_TOOLS_36|SDK_AUTO_DISCOVERY|PROCESS_ENV_ONLY|NO_LOCAL_PROPERTIES_WRITE|APK_SHA256|APKSIGNER")
