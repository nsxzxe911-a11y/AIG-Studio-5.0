package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import com.aigstudio.runtime4.contract.ui.AigUiAction
import kotlin.math.min

/** Transparent hitboxes mapped directly to the approved 941x1672 MULTIFUNCTION artwork. */
object MultifunctionImageInteractionLayout {
    private const val REF_W=941f
    private const val REF_H=1672f

    private data class NavSpec(val id:String,val left:Float,val right:Float,val page:PageId)
    private val nav=listOf(
        NavSpec("IMG.NAV.HOME",12f,88f,PageId.HOME),
        NavSpec("IMG.NAV.CAD",90f,167f,PageId.CAD),
        NavSpec("IMG.NAV.CAM",170f,247f,PageId.CAM),
        NavSpec("IMG.NAV.SIM",250f,327f,PageId.SIM),
        NavSpec("IMG.NAV.MULTIFUNCTION",330f,407f,PageId.MULTIFUNCTION),
        NavSpec("IMG.NAV.3AX",410f,486f,PageId.AXIS3),
        NavSpec("IMG.NAV.4AX",489f,566f,PageId.AXIS4),
        NavSpec("IMG.NAV.5AX",569f,645f,PageId.AXIS5),
        NavSpec("IMG.NAV.6AX.A",648f,724f,PageId.AXIS6),
        NavSpec("IMG.NAV.6AX.B",727f,803f,PageId.AXIS6),
        NavSpec("IMG.NAV.NC",806f,862f,PageId.NC),
        NavSpec("IMG.NAV.AI",865f,934f,PageId.AI),
    )

    fun imageBounds(widthPx:Float,heightPx:Float):UiBounds {
        val scale=min(widthPx/REF_W,heightPx/REF_H)
        val w=REF_W*scale; val h=REF_H*scale
        val left=(widthPx-w)/2f; val top=(heightPx-h)/2f
        return UiBounds(left,top,left+w,top+h)
    }

    fun nodes(widthPx:Float,heightPx:Float):List<RgbGlassButtonNode> {
        val image=imageBounds(widthPx,heightPx)
        val sx=image.width/REF_W; val sy=image.height/REF_H
        val top=image.top+142f*sy; val bottom=image.top+282f*sy
        return nav.mapIndexed{index,spec->
            RgbGlassButtonNode(
                id=spec.id,
                bounds=UiBounds(image.left+spec.left*sx,top,image.left+spec.right*sx,bottom),
                z=2000+index,
                label=spec.page.name,
                textureRef=null,
                commandBinding=null,
                aigActionBinding=AigUiAction.Navigate(spec.page),
                skinRole=RgbSkinRole.NAVIGATION,
            )
        }
    }
}
