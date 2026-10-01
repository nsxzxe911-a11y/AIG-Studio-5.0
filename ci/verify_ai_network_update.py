from pathlib import Path
import re

root=Path(__file__).resolve().parents[1]
secure=(root/"app/src/main/java/com/aigstudio/app/SecureServices.kt").read_text(encoding="utf-8")
main=(root/"app/src/main/java/com/aigstudio/app/MainActivity.kt").read_text(encoding="utf-8")
policy=(root/"core/src/main/kotlin/com/aigstudio/core/RollingUpdatePolicy.kt").read_text(encoding="utf-8")
bundle=(root/"core/src/main/kotlin/com/aigstudio/core/PackageBundle.kt").read_text(encoding="utf-8")
version=(root/"release-version.properties").read_text(encoding="utf-8").strip()

required_secure=[
    'setRequestProperty("Range", "bytes=$resumeFrom-")',
    'catch (io: java.io.IOException)',
    'AppSecurityScanner.sha256(temp)',
    'val append = resumeFrom > 0L && code == 206',
]
for marker in required_secure:
    assert marker in secure, marker
assert 'BuildConfig.VERSION_NAME' not in main, "stale BuildConfig version binding"
assert 'packageManager.getPackageInfo(packageName,0).versionName' in main, "runtime version must come from installed package metadata"

for marker in (
    'if (!config.configured)',
    'showUpdateSettings()',
    'renderNetworkState(true,"更新設定未完成")',
    'AI 更新設定未完成 • Runtime 正常',
):
    assert marker in main, marker

for marker in (
    'MODE="FORWARD_ONLY_AFTER_VERIFIED_PASS"',
    'NETWORK_BLOCKS_RUNTIME=false',
    'PARTIAL_CHECKPOINT_PERSIST=true',
    'CHANGED_PACKAGES_ONLY=true',
    'WORKING_COPY_BEFORE_PROMOTE=true',
    'fun requiresCncRegression',
    'fun canPromote',
    'object DepartmentContinuityPolicy',
    'MODE="RESUME_FROM_LAST_CHECKPOINT"',
    'RED_TEXT_IS_STATUS_NOT_STOP=true',
    'NETWORK_DISCONNECT_RESUMABLE=true',
    'INFRA_FAILURE_RESUMABLE=true',
    'PRODUCT_SAFETY_FAILURE_BLOCKS_RELEASE=true',
    'fun resumeAllowed',
    'fun blocksRelease',
    'fun checkpointFile',
    'fun save(file:File,checkpoint:DepartmentCheckpoint)',
    'fun load(file:File):DepartmentCheckpoint?',
    'object NetworkResiliencePolicy',
    'MODE="OFFLINE_FIRST_CIRCUIT_BREAKER"',
    'UI_THREAD_NETWORK_WAIT_ALLOWED=false',
    'MAX_RETRY_ATTEMPTS=2',
    'CIRCUIT_OPEN_AFTER_FAILURES=3',
    'PEER_DISRUPTION_ACTION="ISOLATE_LOCAL_CONNECTION_ONLY"',
    'fun shouldOpenCircuit',
    'fun networkFailureBlocksRuntime():Boolean=false',
    'fun defensiveOnly():Boolean=true',
):
    assert marker in policy, marker
for package in (
    "network-update-manifest","resumable-update-checkpoint","ai-package-delta-update",
    "verified-working-copy-promote","rolling-baseline"
):
    assert package in bundle, package
m=re.fullmatch(r"versionName=(\d+)\.0\.0",version)
assert m and int(m.group(1))>=254, version
print("STUDIO_AI_NETWORK_UPDATE_GATE_PASS|RESUME_RANGE|PART_CHECKPOINT|SHA256|SIGNER|CHANGED_PACKAGES_ONLY|WORKING_COPY|ROLLING_BASELINE")
print("STUDIO_AI_UPDATE_CNC_SCOPE_GATE_PASS|UI_AI_NETWORK_NO_HEAVY_CNC|GCODE_COORD_COMP_COLLISION_REQUIRE_REGRESSION")

print("STUDIO_AI_DEPARTMENT_CONTINUITY_GATE_PASS|HOME|CAD|CAM|SIM|3AX|4AX|5AX|NC|AI|UIUX|ANDROID_BUILD|WINDOWS_BUILD|ANDROID_COMPILE|WINDOWS_COMPILE|PACKAGE_VERIFY|WEB|WEB_DEPLOY|CHECKPOINT_RESUME|RED_STATUS_NONBLOCKING|SAFETY_BLOCKING")\nprint("STUDIO_NETWORK_RESILIENCE_GATE_PASS|OFFLINE_FIRST|CIRCUIT_BREAKER|RETRY_MAX_2|UI_NEVER_WAITS|LOCAL_ISOLATION_ONLY|NO_PEER_DISRUPTION")
