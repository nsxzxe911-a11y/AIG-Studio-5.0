package com.aigstudio.core

object MorningBaselineVisualRegression {
    @JvmStatic fun main(args:Array<String>) {
        check(MorningBaselineVisualContract.packId == "AIG_MORNING_BASELINE_20261006")
        check(MorningBaselineVisualContract.desktopHome == "AIG_Home_Multifunction_Baseline.png")
        check(MorningBaselineVisualContract.desktopRuntime == "AIG_CNC_Desktop_Baseline.png")
        check(MorningBaselineVisualContract.cadCam == "AIG_CAD_CAM_Desktop_Baseline.png")
        check(MorningBaselineVisualContract.startup == "AIG_CNC_Startup_Baseline.png")
        check(MorningBaselineVisualContract.sixAxis == "AIG_6AX_Baseline.png")
        check(MorningBaselineVisualContract.assetFor("6AX") != MorningBaselineVisualContract.assetFor("5AX"))
        check(MorningBaselineVisualContract.minimumFullSurfaceBytes >= 100_000)
        println("MORNING_BASELINE_VISUAL_PASS")
    }
}
