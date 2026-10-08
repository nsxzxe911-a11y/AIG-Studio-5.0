package com.aigstudio.core

object RuntimeVisualModuleRegression {
    @JvmStatic fun main(args:Array<String>) {
        val ids = RuntimeVisualModuleRegistry.modules.map { it.surface }
        check(ids == listOf("HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"))
        check(RuntimeVisualModuleRegistry.modules.map { it.surface }.distinct().size == 10)
        check(RuntimeVisualModuleRegistry.require("6AX").visualAsset != RuntimeVisualModuleRegistry.require("5AX").visualAsset)
        check(RuntimeVisualModuleRegistry.require("CAD").actionGroup == "CAD_ACTIONS")
        check(RuntimeVisualModuleRegistry.require("CAM").actionGroup == "CAM_ACTIONS")
        check(RuntimeVisualModuleRegistry.require("SIM").sceneProfile == "SIM_SCENE")
        check(RuntimeVisualModuleRegistry.require("HOME").sceneProfile == null)
        check(RuntimeVisualModuleRegistry.modules.all { it.skinId == "AIG_RGB_GLASS" })
        check(RuntimeVisualModuleRegistry.modules.all { it.layoutId.isNotBlank() && it.actionGroup.isNotBlank() })
        println("RUNTIME_VISUAL_MODULE_PASS")
    }
}
