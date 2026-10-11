package com.aigstudio.runtime4.renderer

sealed interface RgbNodeTexturePlan {
    data class Asset(val path:String):RgbNodeTexturePlan
    data class AssetWithLabel(val path:String,val label:String):RgbNodeTexturePlan
    data class GeneratedLabel(val label:String):RgbNodeTexturePlan

    companion object {
        fun forNode(node:RgbGlassButtonNode):RgbNodeTexturePlan {
            val asset=node.textureRef
            if(node.skinRole in setOf(RgbSkinRole.CARD,RgbSkinRole.WORKSTATION_CONTROL,RgbSkinRole.WORKSTATION_NAV,RgbSkinRole.HOME_NAV,RgbSkinRole.HOME_ACTION,RgbSkinRole.HOME_STATUS) && !asset.isNullOrBlank()) {
                return AssetWithLabel(asset,node.label.ifBlank{node.id.substringAfterLast('.')})
            }
            return if(!asset.isNullOrBlank()) Asset(asset)
            else GeneratedLabel(node.label.ifBlank{node.id.substringAfterLast('.')})
        }
    }
}
