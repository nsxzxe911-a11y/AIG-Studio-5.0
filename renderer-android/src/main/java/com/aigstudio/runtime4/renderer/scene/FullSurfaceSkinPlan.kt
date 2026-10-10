package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.SceneId

object FullSurfaceSkinPlan {
    fun assetFor(scene: SceneId, widthPx: Float, heightPx: Float): String? {
        if (widthPx <= heightPx) return null
        return when (scene) {
            SceneId.HOME -> "aig-rgb/full-surface/home_landscape.png"
            else -> null
        }
    }
}
