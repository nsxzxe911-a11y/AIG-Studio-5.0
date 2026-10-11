package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.ui.AigUiLocalization

object MultifunctionSceneLayout {
    private val cardIds=listOf("MULTI.SIM","MULTI.3AX","MULTI.4AX","MULTI.5AX","MULTI.6AX","MULTI.NC","MULTI.AI")
    private val availableAssets=setOf(
        "aig-rgb/icons/workspace.png",
        "aig-rgb/icons/tool_group.png",
        "aig-rgb/multifunction/sim.png",
        "aig-rgb/multifunction/3ax.png",
        "aig-rgb/multifunction/4ax.png",
        "aig-rgb/multifunction/5ax.png",
        "aig-rgb/multifunction/nc.png",
        "aig-rgb/multifunction/ai.png",
    )

    fun nodes(widthPx:Float,heightPx:Float,density:Float,localeId:String="zh-TW"):List<SceneNode> =
        AigComponentNodeAdapter.nodes(MultifunctionDescriptor.descriptor(),layout(widthPx,heightPx,density,localeId))

    fun layout(widthPx:Float,heightPx:Float,density:Float,localeId:String="zh-TW"):AigPageLayout {
        val gap=SharedVisualPolicy.gapPx(density)
        val touch=SharedVisualPolicy.touchPx(density)
        val bounds=linkedMapOf<String,UiBounds>()
        val headerTop=gap
        val headerBottom=headerTop+touch
        bounds["MULTIFUNCTION.HEADER"]=UiBounds(gap,headerTop,widthPx-gap,headerBottom)
        bounds["MULTIFUNCTION.TITLE"]=UiBounds(gap*2,headerTop+touch*0.12f,widthPx-touch*2f,headerTop+touch*0.88f)
        bounds["NAV.HOME"]=UiBounds(widthPx-touch-gap*2,headerTop+gap*0.25f,widthPx-gap*1.25f,headerBottom-gap*0.25f)

        val columns=if(widthPx>=heightPx)4 else 2
        val rows=(cardIds.size+columns-1)/columns
        val gridTop=headerBottom+gap
        val gridBottom=heightPx-gap
        val cellW=(widthPx-gap*(columns+1))/columns
        val cellH=(gridBottom-gridTop-gap*(rows-1))/rows
        require(cellW>=touch && cellH>=touch){"Multifunction grid cannot preserve 48dp touch targets"}
        cardIds.forEachIndexed{index,id->
            val row=index/columns
            val col=index%columns
            val left=gap+col*(cellW+gap)
            val top=gridTop+row*(cellH+gap)
            bounds[id]=UiBounds(left,top,left+cellW,top+cellH)
        }
        return AigPageLayout(
            boundsByControlId=bounds,
            labelsByKey=AigUiLocalization.labels(localeId),
            availableAssets=availableAssets,
            baseZ=50,
        )
    }
}
