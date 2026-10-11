package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId

data class CamImageNavSlot(val page:PageId,val rect:ImagePixelRect)

object CamImagePixelManifest {
    const val referenceWidth=856f
    const val referenceHeight=1836f
    const val expectedSha256="507dfa0dd85b891a55fa1102c8ae6509cfaea605c16e18d3d53f98a3e08e547a"

    // Global navigation is owned by PrimaryPageNavigationLayout.
    val navigation=emptyList<CamImageNavSlot>()

    val controls=linkedMapOf(
        "CAM.TOOL" to ImagePixelRect(163f,939f,421f,979f),
        "CAM.DIAMETER" to ImagePixelRect(163f,983f,421f,1023f),
        "CAM.DEPTH" to ImagePixelRect(163f,1027f,421f,1067f),
        "CAM.SAFE_Z" to ImagePixelRect(163f,1071f,421f,1112f),
        "CAM.FEED" to ImagePixelRect(163f,1116f,421f,1157f),
        "CAM.SPEED" to ImagePixelRect(163f,1161f,421f,1202f),
        "CAM.SIDE" to ImagePixelRect(543f,951f,806f,1016f),
        "CAM.DIRECTION" to ImagePixelRect(543f,1022f,806f,1090f),
        "CAM.AUTO" to ImagePixelRect(18f,1208f,213f,1282f),
        "CAM.ADOPT" to ImagePixelRect(220f,1208f,416f,1282f),
    )

    val viewport=ImagePixelRect(18f,470f,839f,879f)
    val pointPanel=ImagePixelRect(15f,1290f,530f,1573f)
    val strategyPanel=ImagePixelRect(17f,884f,839f,1204f)
    val avoidancePanel=ImagePixelRect(1f,1f,2f,2f)

    val spec=ImageBackedPageSpec(
        referenceWidth=referenceWidth,
        referenceHeight=referenceHeight,
        expectedSha256=expectedSha256,
        controls=controls.map{ImageControlSlot(it.key,it.value)},
        dynamicSlots=listOf(
            ImageDynamicSlot("CAM.VIEWPORT",viewport),
            ImageDynamicSlot("CAM.POINTS",pointPanel),
            ImageDynamicSlot("CAM.STRATEGY",strategyPanel),
        ),
    )

    fun isCompatibleSha(actual:String?)=spec.isCompatibleSha(actual)
    fun isCompatibleBytes(bytes:ByteArray)=spec.isCompatibleBytes(bytes)
}
