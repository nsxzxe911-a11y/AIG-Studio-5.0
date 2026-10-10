package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.SceneId

object SharedVisualPolicy {
    const val MIN_TOUCH_DP = 48f
    const val GAP_DP = 8f

    fun touchPx(density: Float): Float = MIN_TOUCH_DP * density
    fun gapPx(density: Float): Float = GAP_DP * density

    fun destination(nodeId: String): SceneId? = when (nodeId) {
        "NAV.HOME" -> SceneId.HOME
        "NAV.CAD" -> SceneId.CAD
        "NAV.CAM" -> SceneId.CAM
        "NAV.SIM" -> SceneId.SIM
        "NAV.MULTIFUNCTION" -> SceneId.MULTIFUNCTION
        "NAV.3AX" -> SceneId.AXIS3
        "NAV.4AX" -> SceneId.AXIS4
        "NAV.5AX" -> SceneId.AXIS5
        "NAV.6AX" -> SceneId.AXIS6
        "NAV.NC" -> SceneId.NC
        "NAV.AI" -> SceneId.AI
        else -> null
    }
}

