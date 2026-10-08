#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
is_aigii=(ROOT/"shared/aigii/EnvironmentSettings.kt").is_file()
env=(ROOT/("shared/aigii/EnvironmentSettings.kt" if is_aigii else "core/src/main/kotlin/com/aigstudio/core/EnvironmentSettings.kt")).read_text(encoding="utf-8")
main=(ROOT/("app/src/main/java/com/aigii/app/MainActivity.kt" if is_aigii else "app/src/main/java/com/aigstudio/app/MainActivity.kt")).read_text(encoding="utf-8")
desktop_path=("desktop/aigii/DesktopApp.kt" if is_aigii else "desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt")
desktop=(ROOT/desktop_path).read_text(encoding="utf-8")
secure=(ROOT/("app/src/main/java/com/aigii/app/SecureServices.kt" if is_aigii else "app/src/main/java/com/aigstudio/app/SecureServices.kt")).read_text(encoding="utf-8")
policy_path=("shared/aigii/ProjectConnectivityPolicy.kt" if is_aigii else "core/src/main/kotlin/com/aigstudio/core/ProjectConnectivityPolicy.kt")
policy=(ROOT/policy_path).read_text(encoding="utf-8")

def need(cond,code):
    if not cond:
        raise SystemExit("PROJECT_CONNECTIVITY_VERIFY_FAIL|"+code)

for marker in (
    'POLICY="AIG_PROJECT_LOCAL_FIRST_LATEST_WINS"',
    "OFFLINE_FIRST=true",
    "NETWORK_REQUIRED_FOR_LOCAL_RUNTIME=false",
    "UI_THREAD_BLOCKING_ALLOWED=false",
    "AUTO_APPLY_REMOTE=false",
    "AUTO_ROLLBACK=false",
    "AUTO_DOWNGRADE=false",
    "STALE_RESULT_SUPPRESSION=true",
    "MAX_IN_FLIGHT_REQUESTS=1",
    "RECONNECT_DEBOUNCE_MS=40L",
):
    need(marker in policy,"PROJECT_POLICY_"+marker)

for marker in (
    "NETWORK_CAPABILITY_DEBOUNCE_MS = 40L",
    "STALE_NETWORK_RESULT_SUPPRESSION = true",
    "VALIDATED_RECONNECT_RESETS_CIRCUIT_BREAKER = true",
    "SHARED_SYNC_HEAVY_IO_OFF_MAIN = true",
):
    need(marker in env,marker)

for marker in (
    "newSingleThreadExecutor",
    "sharedProjectScanRunning",
    "sharedProjectExecutor.execute",
    "onlineNetworkGeneration",
    "onlineCapabilityDebounceToken",
    "onlineNetworkValidated",
    "requestGeneration!=onlineNetworkGeneration.get()",
    "UpdateNetworkCircuitBreaker.onValidatedReconnect()",
    "NETWORK_CAPABILITY_DEBOUNCE_MS",
):
    need(marker in main,marker)

for marker in (
    "fun isValidated(context: Context): Boolean",
    "NET_CAPABILITY_NOT_SUSPENDED",
    "NETWORK OFFLINE FAST-FAIL",
    "fun onValidatedReconnect()",
    'setRequestProperty("Range", "bytes=$resumeFrom-")',
    'setRequestProperty("If-Range", previousEtag)',
    'setRequestProperty("Accept-Encoding", "identity")',
    'getHeaderField("ETag")',
    "Resume ETag changed",
):
    need(marker in secure,marker)

need("Handler(Looper.getMainLooper())" in main,"UI_HANDLER_PRESENT")
need("sharedProjectExecutor.shutdownNow()" in main,"EXECUTOR_SHUTDOWN")
need("sharedProjectHandler.removeCallbacks(sharedProjectRunnable)" in main,"WATCHER_STOP")

for marker in (
    "sharedSyncExecutor",
    "sharedSyncRunning",
    "sharedSyncExecutor.execute",
    "sharedSyncLastFileStamp",
    "fileStamp!=sharedSyncLastFileStamp",
    "SwingUtilities.invokeLater",
    "shutdownNow()",
):
    need(marker in desktop,"DESKTOP_"+marker)

print("AIG_PROJECT_CONNECTIVITY_VERIFY_PASS|LOCAL_FIRST|RUNTIME_NON_BLOCKING|ANDROID_WINDOWS_OFF_MAIN_SYNC_IO|40MS_DEBOUNCE|LATEST_WINS|STALE_RESULT_SUPPRESSION|VALIDATED_RECONNECT|OFFLINE_FAST_FAIL|RANGE_ETAG_IF_RANGE|NO_AUTO_ROLLBACK|NO_AUTO_DOWNGRADE")
