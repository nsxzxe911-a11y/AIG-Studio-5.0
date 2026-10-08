package com.aigstudio.core

object SkinPackRegistryRegression {
    @JvmStatic fun main(args:Array<String>) {
        check(SkinPackRegistry.packs.map { it.id } == listOf("AIG_RGB_CLASSIC","AIG_NEON_PRO","AIG_INDUSTRIAL_ULTRA"))
        check(SkinPackRegistry.layoutProfiles == setOf("MOBILE_PORTRAIT","MOBILE_LANDSCAPE","DESKTOP_WIDE","DESKTOP_4K"))
        SkinPackRegistry.packs.forEach { pack ->
            check(pack.surfaceAssets.keys == RuntimeSurfaceVisualContract.surfaces.toSet())
            check(pack.surfaceAssets.getValue("6AX") != pack.surfaceAssets.getValue("5AX"))
        }
        val classic = SkinPackRegistry.require("AIG_RGB_CLASSIC")
        val neon = SkinPackRegistry.require("AIG_NEON_PRO")
        val ultra = SkinPackRegistry.require("AIG_INDUSTRIAL_ULTRA")
        check(classic.preferredLayouts.contains("MOBILE_PORTRAIT"))
        check(neon.preferredLayouts.contains("MOBILE_LANDSCAPE"))
        check(ultra.preferredLayouts.contains("DESKTOP_WIDE"))
        check(RuntimeVisualModuleRegistry.require("CAD").actionGroup == "CAD_ACTIONS")
        check(RuntimeVisualModuleRegistry.require("CAM").actionGroup == "CAM_ACTIONS")
        check(RuntimeVisualModuleRegistry.require("6AX").sceneProfile == "6AX_SCENE")
        println("SKIN_PACK_REGISTRY_PASS")
    }
}
