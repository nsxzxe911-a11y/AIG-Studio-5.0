package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.SceneId

object FullSurfaceSkinPlan {
    fun assetFor(scene: SceneId, widthPx: Float, heightPx: Float): String? {
        if (scene != SceneId.HOME) return null
        return if (widthPx > heightPx) {
            "aig-rgb/morning-20261005/home_landscape.png"
        } else {
            "aig-rgb/morning-20261005/home_portrait.png"
        }
    }
}
