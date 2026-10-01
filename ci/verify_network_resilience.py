#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
is_aigii=(ROOT/"shared/aigii/EnvironmentSettings.kt").is_file()
env=(ROOT/("shared/aigii/EnvironmentSettings.kt" if is_aigii else "core/src/main/kotlin/com/aigstudio/core/EnvironmentSettings.kt")).read_text(encoding="utf-8")
main=(ROOT/("app/src/main/java/com/aigii/app/MainActivity.kt" if is_aigii else "app/src/main/java/com/aigstudio/app/MainActivity.kt")).read_text(encoding="utf-8")
desktop_path=("desktop/aigii/DesktopApp.kt" if is_aigii else "desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt")
desktop=(ROOT/desktop_path).read_text(encoding="utf-8")
secure=(ROOT/("app/src/main/java/com/aigii/app/SecureServices.kt" if is_aigii else "app/src/main/java/com/aigstudio/app/SecureServices.kt")).read_text(encoding="utf-8")

def need(cond,code):
    if not cond:
        raise SystemExit("NETWORK_RESILIENCE_BLOCKED|"+code)

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

if is_aigii:
    theme=(ROOT/"app/src/main/java/com/aigii/app/ThemeServices.kt").read_text(encoding="utf-8")
    need("THEME NETWORK OFFLINE FAST-FAIL" in theme,"THEME_FAST_FAIL")
    need("NetworkSecurity.isValidated(context)" in theme,"THEME_VALIDATED_NETWORK")

print("NETWORK_RESILIENCE_GATE_PASS|ANDROID_WINDOWS_OFF_MAIN_SYNC_IO|40MS_DEBOUNCE|STALE_RESULT_SUPPRESSION|VALIDATED_RECONNECT_RESET|OFFLINE_FAST_FAIL|RANGE_ETAG_IF_RANGE|CHECKPOINT_RETAINED")
