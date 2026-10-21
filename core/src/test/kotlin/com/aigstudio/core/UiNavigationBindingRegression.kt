package com.aigstudio.core

/** Proves stable 10-page ID -> SharedUiCommand -> exactly one caller callback.
 * Android/Windows actual UI entrypoints are compiled by the native Gate.
 * This JVM test is NOT a device interaction or artwork pixel hit-test.
 */
fun main() {
    val expected=listOf("HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI")
    val items=UiButtonManifestContract.PRODUCTION_NAVIGATION
    check(items.map{it.surfaceId}==expected) { "All 10 production pages, including 6AX, are mandatory" }
    check(items.map{it.buttonId}.distinct().size==10)
    for(page in expected) {
        val buttonId="NAV_"+page
        val entry=UiButtonManifestContract.byButtonId(buttonId)
        check(entry.assetId.isNotBlank() && entry.verifiedCallback.isNotBlank())
        var count=0
        var actual:SharedUiCommand?=null
        val returned=UiButtonManifestContract.dispatchNavigation(buttonId,page){ cmd ->
            count++
            actual=cmd
        }
        check(count==1 && actual==entry.command && returned==entry.command) {
            "Real callback must be invoked exactly once with a matching command: $page"
        }
        check(runCatching{
            UiButtonManifestContract.dispatchNavigation(buttonId,"WRONG_PAGE"){error("MUST_NOT_CALL")}
        }.isFailure)
    }
    check(runCatching{
        UiButtonManifestContract.dispatchNavigation("NAV_LEGACY","HOME"){error("MUST_NOT_CALL")}
    }.isFailure)
    check(UiButtonManifestContract.byButtonId("NAV_6AX").command==SharedUiCommand.OPEN_6AX)
    check(UiButtonManifestContract.byButtonId("NAV_NC").command==SharedUiCommand.OPEN_NC)
    println("STUDIO_NAV_CONTROL_CHAIN_PASS|10_REAL_IDS|HOME|6AX|NC|ONE_CALLBACK_PER_CLICK|MISMATCH_BLOCKED|UNKNOWN_BLOCKED|CORE_CALLBACK_REQUIRED")
}
