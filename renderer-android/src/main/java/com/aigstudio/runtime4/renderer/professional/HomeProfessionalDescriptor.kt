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
            return HomeLivePresentation(
                l.getValue("home.machine.value"),
                l.getValue("home.project.value"),
                l.getValue("home.ai.value"),
            )
        }

        fun from(nc:NcState?,ai:AiState?,localeId:String="zh-TW"):HomeLivePresentation {
            val l=AigUiLocalization.labels(localeId)
            val project=nc?.working?.takeIf{it.id!="NC0" || it.program.isNotBlank()}
                ?.let{"${it.id} | REV ${it.revision}"}
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
    private fun panel(id:String,kind:AigUiKind=AigUiKind.PANEL)=
        AigUiComponent(id,kind,null,null,AigUiState.NORMAL,true,true,null)
    private fun label(id:String,key:String)=
        AigUiComponent(id,AigUiKind.LABEL,key,null,AigUiState.NORMAL,false,true,null)
    private fun nav(id:String,key:String,page:PageId)=
        AigUiComponent(id,AigUiKind.NAV,key,null,AigUiState.NORMAL,true,true,AigUiAction.Navigate(page))
    private fun button(id:String,key:String,page:PageId,kind:AigUiKind=AigUiKind.BUTTON)=
        AigUiComponent(id,kind,key,null,AigUiState.NORMAL,true,true,AigUiAction.Navigate(page))

    fun descriptor():AigUiPageDescriptor=AigUiPageDescriptor(PageId.HOME,listOf(
        panel("HOME.HEADER"),
        label("HOME.TITLE","home.title"),
        label("HOME.RUNTIME","home.runtime"),
        nav("NAV.HOME","nav.home",PageId.HOME),
        nav("NAV.CAD","nav.cad",PageId.CAD),
        nav("NAV.CAM","nav.cam",PageId.CAM),
        nav("NAV.SIM","nav.sim",PageId.SIM),
        nav("NAV.MULTIFUNCTION","nav.multifunction",PageId.MULTIFUNCTION),
        nav("NAV.NC","nav.nc",PageId.NC),
        nav("NAV.AI","nav.ai",PageId.AI),
        panel("HOME.MACHINE.CARD",AigUiKind.STATUS_CARD),
        label("HOME.MACHINE.TITLE","home.machine.title"),
        label("HOME.MACHINE.VALUE","home.machine.value"),
        panel("HOME.PROJECT.CARD",AigUiKind.STATUS_CARD),
        label("HOME.PROJECT.TITLE","home.project.title"),
        label("HOME.PROJECT.VALUE","home.project.value"),
        panel("HOME.HERO",AigUiKind.VIEWPORT),
        label("HOME.HERO.TITLE","home.hero.title"),
        panel("HOME.AI.CARD",AigUiKind.STATUS_CARD),
        label("HOME.AI.TITLE","home.ai.title"),
        label("HOME.AI.VALUE","home.ai.value"),
        panel("HOME.QUICK.DECK",AigUiKind.CONTROL_DECK),
        label("HOME.QUICK.TITLE","home.quick.title"),
        button("HOME.QUICK.CAD","home.quick.cad",PageId.CAD),
        button("HOME.QUICK.SIM","home.quick.sim",PageId.SIM),
        button("HOME.QUICK.NC","home.quick.nc",PageId.NC),
        button("HOME.MULTIFUNCTION.OPEN","home.multifunction",PageId.MULTIFUNCTION,AigUiKind.CARD),
    ))
}
