package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId

enum class ImageAssetPlatform { MOBILE, WINDOWS }
enum class ImageAssetQuality { FORMAL, REFERENCE_ONLY, REJECTED }

data class ImageAssetTarget(val width:Int,val height:Int)
data class ImageAssetCandidate(
    val ownerPage:PageId,
    val platform:ImageAssetPlatform,
    val width:Int,
    val height:Int,
    val collage:Boolean,
)

object ImageBackedPageRegistry {
    private val mobileFormal=ImageAssetTarget(1440,3088)
    private val windowsFormal=ImageAssetTarget(3840,2160)

    fun formalTarget(platform:ImageAssetPlatform):ImageAssetTarget=when(platform){
        ImageAssetPlatform.MOBILE->mobileFormal
        ImageAssetPlatform.WINDOWS->windowsFormal
    }

    fun classify(requestedPage:PageId,candidate:ImageAssetCandidate):ImageAssetQuality {
        if(candidate.ownerPage!=requestedPage || candidate.collage || candidate.width<=0 || candidate.height<=0){
            return ImageAssetQuality.REJECTED
        }
        val orientationOk=when(candidate.platform){
            ImageAssetPlatform.MOBILE->candidate.height>candidate.width
            ImageAssetPlatform.WINDOWS->candidate.width>candidate.height
        }
        if(!orientationOk)return ImageAssetQuality.REJECTED
        val target=formalTarget(candidate.platform)
        return if(candidate.width>=target.width && candidate.height>=target.height){
            ImageAssetQuality.FORMAL
        }else{
            ImageAssetQuality.REFERENCE_ONLY
        }
    }
}
