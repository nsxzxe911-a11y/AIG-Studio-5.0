package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId

/** Whitelisted live 3D zones inside the approved 856x1836 axis preview skins. */
object AxisImageRuntimeLayout {
    private const val REF_W=856f
    private const val REF_H=1836f
    private val viewports=mapOf(
        PageId.AXIS3 to ImagePixelRect(18f,435f,510f,900f),
        PageId.AXIS4 to ImagePixelRect(18f,470f,838f,860f),
        PageId.AXIS5 to ImagePixelRect(18f,470f,838f,879f),
        PageId.AXIS6 to ImagePixelRect(18f,470f,838f,860f),
    )
    fun viewport(page:PageId,screenWidth:Float,screenHeight:Float):UiBounds?=
        viewports[page]?.let{AdaptivePageTransform.forViewport(REF_W,REF_H,screenWidth,screenHeight).sourceRectToScreen(it)}
}
