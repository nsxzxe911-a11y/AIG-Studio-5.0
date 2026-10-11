package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.contract.ui.*

data class HomeLivePresentation(
    val machineValue:String,
    val projectValue:String,
    val aiValue:String,
){
    fun labels(localeId:String):Map<String,String> = AigUiLocalization.labels(localeId)+mapOf(
        "home.machine.value" to machineValue,
        "home.project.value" to projectValue,
        "home.ai.value" to aiValue,
    )

    companion object {
        fun localOnly(localeId:String="zh-TW"):HomeLivePresentation {
            val l=AigUiLocalization.labels(localeId)
            return HomeLivePresentation(l.getValue("home.machine.value"),l.getValue("home.project.value"),l.getValue("home.ai.value"))
        }

        fun from(nc:NcState?,ai:AiState?,localeId:String="zh-TW"):HomeLivePresentation {
            val l=AigUiLocalization.labels(localeId)
            val project=nc?.working?.takeIf{it.id!="NC0" || it.program.isNotBlank()}?.let{"${it.id} | REV ${it.revision}"}
                ?: l.getValue("home.project.value")
            val message=ai?.message
            val aiText=when {
                ai==null -> l.getValue("home.ai.value")
                message?.severity==MessageSeverity.ALARM -> message.text
                ai.verified -> if(localeId=="zh-TW") "AI 已驗證 | ISSUES ${ai.issueCount}" else "AI Verified | ISSUES ${ai.issueCount}"
                ai.available -> l.getValue("home.ai.value")
                else -> if(localeId=="zh-TW") "AI 離線｜Local Vault 可用" else "AI Offline | Local Vault Available"
            }
            return HomeLivePresentation(l.getValue("home.machine.value"),project,aiText)
        }
    }
}

object HomeProfessionalDescriptor {
    private fun panel(id:String)=AigUiComponent(id,AigUiKind.PANEL,null,null,AigUiState.NORMAL,true,true,null)
    private fun label(id:String,key:String)=AigUiComponent(id,AigUiKind.LABEL,key,null,AigUiState.NORMAL,false,true,null)
    private fun nav(id:String,key:String,page:PageId,icon:String)=AigUiComponent(id,AigUiKind.NAV,key,icon,AigUiState.NORMAL,true,true,AigUiAction.Navigate(page))
    private fun action(id:String,key:String,page:PageId,icon:String)=AigUiComponent(id,AigUiKind.BUTTON,key,icon,AigUiState.NORMAL,true,true,AigUiAction.Navigate(page))
    private fun status(id:String,key:String,icon:String,online:Boolean)=AigUiComponent(
        id,AigUiKind.STATUS_CARD,key,icon,if(online)AigUiState.SELECTED else AigUiState.DISABLED,false,true,null
    )

    fun descriptor():AigUiPageDescriptor=AigUiPageDescriptor(PageId.HOME,buildList{
        add(panel("HOME.HEADER"));add(label("HOME.TITLE","home.title"));add(label("HOME.RUNTIME","home.runtime"))
        add(label("HOME.HEADER.MACHINE","home.machine.value"));add(label("HOME.HEADER.PROJECT","home.project.value"))

        add(nav("NAV.HOME","nav.home",PageId.HOME,"aig-rgb/home/workspace.png"))
        add(nav("NAV.CAD","nav.cad",PageId.CAD,"aig-rgb/home/cad.png"))
        add(nav("NAV.CAM","nav.cam",PageId.CAM,"aig-rgb/home/cam.png"))
        add(nav("NAV.SIM","nav.sim",PageId.SIM,"aig-rgb/home/sim.png"))
        add(nav("NAV.3AX","multifunction.3ax",PageId.AXIS3,"aig-rgb/home/3ax.png"))
        add(nav("NAV.4AX","multifunction.4ax",PageId.AXIS4,"aig-rgb/home/4ax.png"))
        add(nav("NAV.5AX","multifunction.5ax",PageId.AXIS5,"aig-rgb/home/5ax.png"))
        add(nav("NAV.6AX","multifunction.6ax",PageId.AXIS6,"aig-rgb/home/tool_group.png"))
        add(nav("NAV.NC","nav.nc",PageId.NC,"aig-rgb/home/nc.png"))
        add(nav("NAV.AI","nav.ai",PageId.AI,"aig-rgb/home/ai.png"))

        add(panel("HOME.CONNECTIONS.PANEL"));add(label("HOME.CONNECTIONS.TITLE","home.connections.title"))
        add(status("HOME.CONNECTIONS.CAD","home.connections.cad","aig-rgb/home/cad.png",true))
        add(status("HOME.CONNECTIONS.CAM","home.connections.cam","aig-rgb/home/cam.png",true))
        add(status("HOME.CONNECTIONS.SIM","home.connections.sim","aig-rgb/home/sim.png",true))
        add(status("HOME.CONNECTIONS.NC","home.connections.nc","aig-rgb/home/nc.png",true))
        add(status("HOME.CONNECTIONS.AI","home.connections.ai","aig-rgb/home/ai.png",true))
        add(status("HOME.CONNECTIONS.CLOUD","home.connections.cloud","aig-rgb/home/workspace.png",false))

        add(panel("HOME.QUICK.PANEL"));add(label("HOME.QUICK.TITLE","home.quick.title"))
        add(action("HOME.QUICK.CAD","home.quick.cad",PageId.CAD,"aig-rgb/home/cad.png"))
        add(action("HOME.QUICK.CAM","home.quick.cam",PageId.CAM,"aig-rgb/home/cam.png"))
        add(action("HOME.QUICK.SIM","home.quick.sim",PageId.SIM,"aig-rgb/home/sim.png"))
        add(action("HOME.QUICK.NC","home.quick.nc",PageId.NC,"aig-rgb/home/nc.png"))
        add(action("HOME.QUICK.AI","home.quick.ai",PageId.AI,"aig-rgb/home/ai.png"))

        add(panel("HOME.ONECLICK.PANEL"));add(label("HOME.ONECLICK.TITLE","home.oneclick.title"))
        add(action("HOME.ONECLICK.CAD","home.oneclick.cad",PageId.CAD,"aig-rgb/home/cad.png"))
        add(action("HOME.ONECLICK.CAM","home.oneclick.cam",PageId.CAM,"aig-rgb/home/cam.png"))
        add(action("HOME.ONECLICK.SIM","home.oneclick.sim",PageId.SIM,"aig-rgb/home/sim.png"))
        add(action("HOME.ONECLICK.NC","home.oneclick.nc",PageId.NC,"aig-rgb/home/nc.png"))
        add(action("HOME.ONECLICK.AI","home.oneclick.ai",PageId.AI,"aig-rgb/home/ai.png"))

        add(panel("HOME.FILES.PANEL"));add(label("HOME.FILES.TITLE","home.files.title"));add(label("HOME.FILES.VALUE","home.project.value"))
        add(panel("HOME.TOOLS.PANEL"));add(label("HOME.TOOLS.TITLE","home.tools.title"));add(label("HOME.TOOLS.VALUE","home.tools.value"))
        add(panel("HOME.USER.PANEL"));add(label("HOME.USER.TITLE","home.user.title"));add(label("HOME.USER.VALUE","home.user.value"))
        add(panel("HOME.LINKS.PANEL"));add(label("HOME.LINKS.TITLE","home.links.title"));add(label("HOME.LINKS.VALUE","home.links.value"))
        add(panel("HOME.SYSTEM.PANEL"));add(label("HOME.SYSTEM.TITLE","home.system.title"));add(label("HOME.SYSTEM.VALUE","home.ai.value"))
    })
}
