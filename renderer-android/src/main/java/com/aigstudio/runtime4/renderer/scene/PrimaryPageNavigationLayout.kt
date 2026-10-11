package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import com.aigstudio.runtime4.contract.ui.AigUiAction

/** One screen-space navigation geometry shared by all visible primary mobile pages. */
object PrimaryPageNavigationLayout {
    private const val REF_W=941f
    private const val REF_H=1672f
    private const val TOP=142f
    private const val BOTTOM=228f
    private data class Spec(val id:String,val left:Float,val right:Float,val page:PageId)
    private val specs=listOf(
        Spec("IMG.NAV.HOME",22f,106f,PageId.HOME),
        Spec("IMG.NAV.CAD",112f,196f,PageId.CAD),
        Spec("IMG.NAV.CAM",201f,285f,PageId.CAM),
        Spec("IMG.NAV.SIM",291f,375f,PageId.SIM),
        Spec("IMG.NAV.AXIS3",380f,464f,PageId.AXIS3),
        Spec("IMG.NAV.AXIS4",470f,554f,PageId.AXIS4),
        Spec("IMG.NAV.AXIS5",559f,643f,PageId.AXIS5),
        Spec("IMG.NAV.AXIS6",649f,733f,PageId.AXIS6),
        Spec("IMG.NAV.NC",738f,822f,PageId.NC),
        Spec("IMG.NAV.AI",828f,912f,PageId.AI),
    )

    fun nodes(screenWidth:Float,screenHeight:Float,activePage:PageId):List<RgbGlassButtonNode>{
        val transform=AdaptivePageTransform.forViewport(REF_W,REF_H,screenWidth,screenHeight)
        return specs.mapIndexed{index,spec->
            val bounds=transform.sourceRectToScreen(ImagePixelRect(spec.left,TOP,spec.right,BOTTOM))
            RgbGlassButtonNode(
                id=spec.id,
                bounds=bounds,
                z=5100+index,
                label=spec.page.name,
                textureRef=null,
                commandBinding=null,
                aigActionBinding=AigUiAction.Navigate(spec.page),
                skinRole=RgbSkinRole.NAVIGATION,
                visualState=if(spec.page==activePage) VisualState.SELECTED else VisualState.NORMAL,
            )
        }
    }
}
