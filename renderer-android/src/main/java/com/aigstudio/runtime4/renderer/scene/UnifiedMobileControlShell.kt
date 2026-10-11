package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import com.aigstudio.runtime4.contract.UnifiedButtonTokens
import com.aigstudio.runtime4.contract.ui.AigUiAction

object UnifiedMobileControlShell {
    private val simIds=setOf("SIM.PLAY","SIM.STEP","SIM.RESET","SIM.DISPLAY")
    private val aiIds=setOf("AI.OPEN","AI.VERIFY","AI.RESTORE")

    private fun isLegacyPageNav(id:String):Boolean =
        id.startsWith("NAV.") || id.startsWith("IMG.CAD.NAV.") ||
            (id.startsWith("IMG.HOME.NAV.") && id!="IMG.HOME.NAV.MULTIFUNCTION")

    fun realToolButtons(base:List<SceneNode>,page:PageId):List<RgbGlassButtonNode> =
        base.filterIsInstance<RgbGlassButtonNode>().filter{node->
            when(page){
                PageId.CAM->node.id.startsWith("CAM.") && (node.camCommandBinding!=null || node.aigActionBinding is AigUiAction.Cam)
                PageId.SIM->node.id in simIds
                PageId.NC->node.id.startsWith("NC.") && node.ncCommandBinding!=null
                PageId.AI->node.id in aiIds
                else->false
            }
        }

    fun toolPages(base:List<SceneNode>,page:PageId):List<List<RgbGlassButtonNode>> =
        realToolButtons(base,page).chunked(4)

    fun toolPanelBounds(widthPx:Float,heightPx:Float,density:Float):UiBounds{
        val d=density.coerceAtLeast(0.5f)
        val margin=UnifiedButtonTokens.GAP_DP*d
        val height=UnifiedButtonTokens.PREFERRED_TOUCH_DP*d
        return UiBounds(margin,(heightPx-margin-height).coerceAtLeast(margin),widthPx-margin,heightPx-margin)
    }

    fun toolRibbonNodes(
        base:List<SceneNode>,page:PageId,widthPx:Float,heightPx:Float,density:Float,pageIndex:Int,
    ):List<RgbGlassButtonNode>{
        val pages=toolPages(base,page)
        if(pages.isEmpty())return emptyList()
        val visible=pages[pageIndex.coerceIn(0,pages.lastIndex)]
        val panel=toolPanelBounds(widthPx,heightPx,density)
        val slots=PageToolRibbonLayout.slots(panel,visible.map{it.id},UnifiedButtonTokens.GAP_DP*density.coerceAtLeast(0.5f))
        return visible.zip(slots).mapIndexed{index,(source,slot)->
            RgbGlassButtonNode(
                id=source.id,bounds=slot.bounds,z=4300+index,label=source.label,textureRef=source.textureRef,
                commandBinding=source.commandBinding,visualState=source.visualState,enabled=source.enabled,visible=true,
                camCommandBinding=source.camCommandBinding,ncCommandBinding=source.ncCommandBinding,
                skinRole=RgbSkinRole.WORKSTATION_CONTROL,aigActionBinding=source.aigActionBinding,
            )
        }
    }

    fun compose(
        base:List<SceneNode>,page:PageId,widthPx:Float,heightPx:Float,density:Float,toolPageIndex:Int,
    ):List<SceneNode>{
        if(page==PageId.MULTIFUNCTION)return base
        val toolIds=realToolButtons(base,page).map{it.id}.toSet()
        val cleaned=base.filterNot{node->isLegacyPageNav(node.id) || node.id in toolIds}.toMutableList()
        cleaned+=toolRibbonNodes(base,page,widthPx,heightPx,density,toolPageIndex)
        cleaned+=GlobalPageRibbon.layout(widthPx,heightPx,density,page).buttons
        return cleaned
    }
}
