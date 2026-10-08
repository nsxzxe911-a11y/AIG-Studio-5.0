package com.aigstudio.core

/**
 * 2026-10-06 morning visual references recovered from the AIG Library.
 * These are full-surface visual baselines, not button icons and not runtime proof.
 */
object MorningBaselineVisualContract {
    const val packId = "AIG_MORNING_BASELINE_20261006"
    const val desktopHome = "AIG_Home_Multifunction_Baseline.png"
    const val desktopRuntime = "AIG_CNC_Desktop_Baseline.png"
    const val cadCam = "AIG_CAD_CAM_Desktop_Baseline.png"
    const val startup = "AIG_CNC_Startup_Baseline.png"
    const val sixAxis = "AIG_6AX_Baseline.png"

    // Guard against stretching the historical ~1KB generated icon pack into a page.
    const val minimumFullSurfaceBytes = 100_000

    fun assetFor(surface:String):String = when(RuntimeSurfaceVisualContract.normalize(surface)) {
        "HOME" -> desktopHome
        "CAD","CAM" -> cadCam
        "6AX" -> sixAxis
        "3AX","4AX","5AX","SIM","NC","AI" -> desktopRuntime
        else -> desktopRuntime
    }
}
