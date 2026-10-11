package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import com.aigstudio.runtime4.contract.ui.*

object MultifunctionDescriptor {
    private fun card(id:String,key:String,icon:String,page:PageId)=AigUiComponent(
        controlId=id,
        kind=AigUiKind.CARD,
        labelKey=key,
        iconAsset=icon,
        state=AigUiState.NORMAL,
        enabled=true,
        visible=true,
        action=AigUiAction.Navigate(page),
    )

    fun descriptor():AigUiPageDescriptor=AigUiPageDescriptor(
        PageId.MULTIFUNCTION,
        listOf(
            AigUiComponent("MULTIFUNCTION.HEADER",AigUiKind.PANEL,null,null,AigUiState.NORMAL,true,true,null),
            AigUiComponent("MULTIFUNCTION.TITLE",AigUiKind.LABEL,"multifunction.title",null,AigUiState.NORMAL,false,true,null),
            AigUiComponent("NAV.HOME",AigUiKind.NAV,"nav.home","aig-rgb/icons/workspace.png",AigUiState.NORMAL,true,true,AigUiAction.Navigate(PageId.HOME)),
            card("MULTI.SIM","multifunction.sim","aig-rgb/multifunction/sim.png",PageId.SIM),
            card("MULTI.3AX","multifunction.3ax","aig-rgb/multifunction/3ax.png",PageId.AXIS3),
            card("MULTI.4AX","multifunction.4ax","aig-rgb/multifunction/4ax.png",PageId.AXIS4),
            card("MULTI.5AX","multifunction.5ax","aig-rgb/multifunction/5ax.png",PageId.AXIS5),
            card("MULTI.6AX","multifunction.6ax","aig-rgb/icons/tool_group.png",PageId.AXIS6),
            card("MULTI.NC","multifunction.nc","aig-rgb/multifunction/nc.png",PageId.NC),
            card("MULTI.AI","multifunction.ai","aig-rgb/multifunction/ai.png",PageId.AI),
        ),
    )
}
