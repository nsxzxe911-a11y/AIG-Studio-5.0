package com.aigstudio.core

object SkinSwapIsolationRegression {
    @JvmStatic fun main(args:Array<String>) {
        val before = RuntimeSurfaceVisualContract.surfaces.associateWith { s ->
            RuntimeVisualModuleRegistry.require(s).actionGroup to RuntimeVisualModuleRegistry.require(s).sceneProfile
        }
        RuntimeSkinState.select("AIG_RGB_CLASSIC","MOBILE_PORTRAIT")
        val classic6 = RuntimeSkinState.assetFor("6AX")
        RuntimeSkinState.select("AIG_NEON_PRO","MOBILE_LANDSCAPE")
        val neon6 = RuntimeSkinState.assetFor("6AX")
        RuntimeSkinState.select("AIG_INDUSTRIAL_ULTRA","DESKTOP_WIDE")
        val ultra6 = RuntimeSkinState.assetFor("6AX")
        check(setOf(classic6,neon6,ultra6).size == 3)
        val after = RuntimeSurfaceVisualContract.surfaces.associateWith { s ->
            RuntimeVisualModuleRegistry.require(s).actionGroup to RuntimeVisualModuleRegistry.require(s).sceneProfile
        }
        check(before == after)
        check(RuntimeSkinState.layoutProfile == "DESKTOP_WIDE")
        check(RuntimeSkinState.skinId == "AIG_INDUSTRIAL_ULTRA")
        println("SKIN_SWAP_ISOLATION_PASS")
    }
}
