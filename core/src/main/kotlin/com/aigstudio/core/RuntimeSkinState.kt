package com.aigstudio.core

/**
 * Runtime skin/layout selector. This state is presentation-only: changing it
 * must never mutate machining truth, action callbacks, toolpaths or NC data.
 */
object RuntimeSkinState {
    @Volatile var skinId:String="AIG_RGB_CLASSIC"
        private set
    @Volatile var layoutProfile:String="MOBILE_PORTRAIT"
        private set

    @Synchronized
    fun select(newSkinId:String,newLayoutProfile:String) {
        val pack=SkinPackRegistry.require(newSkinId)
        require(newLayoutProfile in SkinPackRegistry.layoutProfiles){"Unknown layout profile: $newLayoutProfile"}
        skinId=pack.id
        layoutProfile=newLayoutProfile
    }

    fun assetFor(surface:String):String {
        val normalized=RuntimeSurfaceVisualContract.normalize(surface)
        return SkinPackRegistry.require(skinId).surfaceAssets.getValue(normalized)
    }
}
