package com.aigstudio.runtime4.renderer

import java.security.MessageDigest

data class ImagePixelPoint(val x:Float,val y:Float)

data class ImagePixelRect(val left:Float,val top:Float,val right:Float,val bottom:Float){
    val width:Float get()=right-left
    val height:Float get()=bottom-top
    fun contains(x:Float,y:Float):Boolean=x>=left&&x<=right&&y>=top&&y<=bottom
}

data class ImageControlSlot(val controlId:String,val rect:ImagePixelRect)
data class ImageDynamicSlot(val slotId:String,val rect:ImagePixelRect)

data class ImageBackedPageSpec(
    val referenceWidth:Float,
    val referenceHeight:Float,
    val expectedSha256:String,
    val controls:List<ImageControlSlot> = emptyList(),
    val dynamicSlots:List<ImageDynamicSlot> = emptyList(),
    val verticalAnchor:Float = 0.5f,
){
    init {
        require(referenceWidth>0f && referenceHeight>0f)
        require(verticalAnchor in 0f..1f)
    }
    fun isCompatibleSha(actual:String?):Boolean=
        actual?.trim()?.lowercase()==expectedSha256.trim().lowercase()
    fun isCompatibleBytes(bytes:ByteArray):Boolean=isCompatibleSha(sha256(bytes))
    fun controlAtPixel(x:Float,y:Float):ImageControlSlot?=
        controls.firstOrNull{it.rect.contains(x,y)}
    fun dynamicSlot(slotId:String):ImageDynamicSlot?=
        dynamicSlots.firstOrNull{it.slotId==slotId}

    companion object {
        fun sha256(bytes:ByteArray):String=
            MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}
    }
}

object ImagePixelMapper {
    private fun transform(spec:ImageBackedPageSpec,screenWidth:Float,screenHeight:Float)=
        AdaptivePageTransform.forViewport(spec.referenceWidth,spec.referenceHeight,screenWidth,screenHeight)

    fun imageBounds(spec:ImageBackedPageSpec,screenWidth:Float,screenHeight:Float):UiBounds=
        transform(spec,screenWidth,screenHeight).bounds

    fun screenToImagePixel(spec:ImageBackedPageSpec,screenWidth:Float,screenHeight:Float,x:Float,y:Float):ImagePixelPoint?=
        transform(spec,screenWidth,screenHeight).screenToSource(x,y)

    fun imagePixelToScreen(spec:ImageBackedPageSpec,screenWidth:Float,screenHeight:Float,x:Float,y:Float):ImagePixelPoint=
        transform(spec,screenWidth,screenHeight).sourceToScreen(x,y)

    fun pixelRectToScreen(spec:ImageBackedPageSpec,screenWidth:Float,screenHeight:Float,rect:ImagePixelRect):UiBounds=
        transform(spec,screenWidth,screenHeight).sourceRectToScreen(rect)
}
