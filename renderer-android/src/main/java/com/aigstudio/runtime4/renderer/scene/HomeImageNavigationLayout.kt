package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import com.aigstudio.runtime4.contract.ui.AigUiAction
import kotlin.math.min

/** Shared transparent top navigation for every 941x1672 AIG II mobile skin. */
object HomeImageNavigationLayout {
    private const val REF_W=941f
    private const val REF_H=1672f
    private data class Spec(val id:String,val left:Float,val right:Float,val page:PageId)
    private val nav=listOf(
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
    fun imageBounds(widthPx:Float,heightPx:Float):UiBounds{
        val scale=min(widthPx/REF_W,heightPx/REF_H)
        val w=REF_W*scale
        val h=REF_H*scale
        val left=(widthPx-w)/2f
        val top=(heightPx-h)/2f
        return UiBounds(left,top,left+w,top+h)
    }
    fun nodes(widthPx:Float,heightPx:Float):List<RgbGlassButtonNode>{
        val image=imageBounds(widthPx,heightPx)
        val sx=image.width/REF_W
        val sy=image.height/REF_H
        val top=image.top+142f*sy
        val bottom=image.top+228f*sy
        return nav.mapIndexed{index,spec->RgbGlassButtonNode(
            id=spec.id,
            bounds=UiBounds(image.left+spec.left*sx,top,image.left+spec.right*sx,bottom),
            z=5100+index,
            label=spec.page.name,
            textureRef=null,
            commandBinding=null,
            aigActionBinding=AigUiAction.Navigate(spec.page),
            skinRole=RgbSkinRole.NAVIGATION,
        )}
    }
}
