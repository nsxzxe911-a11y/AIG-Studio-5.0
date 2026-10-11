package com.aigstudio.runtime4.renderer

data class ImageRuntimeOverlayCell(
    val slotId:String,
    val bounds:UiBounds,
    val text:String?,
    val available:Boolean,
    val coverBakedArt:Boolean=true,
)

data class ImageBackedRuntimeOverlay(val cells:List<ImageRuntimeOverlayCell>)

object ImageBackedRuntimeOverlayPlan {
    fun build(
        spec:ImageBackedPageSpec,
        screenWidth:Float,
        screenHeight:Float,
        runtimeText:Map<String,String?>,
    ):ImageBackedRuntimeOverlay {
        val cells=spec.dynamicSlots.map { slot ->
            val text=runtimeText[slot.slotId]?.takeIf { it.isNotBlank() }
            ImageRuntimeOverlayCell(
                slotId=slot.slotId,
                bounds=ImagePixelMapper.pixelRectToScreen(spec,screenWidth,screenHeight,slot.rect),
                text=text,
                available=text!=null,
            )
        }
        return ImageBackedRuntimeOverlay(cells)
    }
}
