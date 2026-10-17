package com.aigstudio.desktop

import com.aigstudio.core.PageCommand
import com.aigstudio.core.PageCommandCatalog
import com.aigstudio.core.PageId
import com.aigstudio.core.PageMessage
import com.aigstudio.core.PageResult
import com.aigstudio.core.PageRuntime
import com.aigstudio.core.SubpageId
import com.aigstudio.core.UiDualIdContract

class PageRuntimeRouter(
    private val runtimeProvider:(PageId)->PageRuntime?,
    private val pageNavigator:(PageId)->Unit,
    private val resultSink:(PageResult)->Unit = {},
    private val messageSink:(PageMessage)->Unit = {},
) {
    companion object {
        val NAVIGATION:Map<String,PageId> = linkedMapOf(
            "NAV_HOME" to PageId.HOME,
            "NAV_CAD" to PageId.CAD,
            "NAV_CAM" to PageId.CAM,
            "NAV_SIM" to PageId.SIM,
            "NAV_3AX" to PageId.AX3,
            "NAV_4AX" to PageId.AX4,
            "NAV_5AX" to PageId.AX5,
            "NAV_6AX" to PageId.AX6,
            "NAV_NC" to PageId.NC,
            "NAV_AI" to PageId.AI,
        )
    }

    fun navigate(buttonId:String):PageId {
        val target=NAVIGATION[buttonId] ?: error("Unknown production navigation Button ID: $buttonId")
        pageNavigator(target)
        return target
    }

    fun navigateView(viewId:String):PageId = navigate(UiDualIdContract.navigationButtonId(viewId))

    fun dispatchView(
        viewId:String,
        arguments:Map<String,String> = emptyMap(),
        subpageId:String?=null,
    ):PageResult = dispatchButton(UiDualIdContract.buttonIdForView(viewId),arguments,subpageId)

    fun dispatchButton(
        buttonId:String,
        arguments:Map<String,String> = emptyMap(),
        subpageId:String?=null,
    ):PageResult {
        val definition=PageCommandCatalog.requireDefinition(buttonId)
        val runtime=runtimeProvider(definition.page)
            ?: return PageResult.Rejected(definition.page,"PAGE_RUNTIME_UNAVAILABLE",0L,"No runtime registered for ${definition.page.id}")
        val subpage=resolveSubpage(definition.allowedSubpages,subpageId)
        val before=runtime.messages().size
        val result=runtime.dispatch(PageCommand(definition.page,subpage,definition.commandId,arguments))
        resultSink(result)
        runtime.messages().drop(before).forEach(messageSink)
        return result
    }

    private fun resolveSubpage(allowed:Set<SubpageId>,requested:String?):SubpageId {
        if(requested!=null) return allowed.firstOrNull{it.value==requested}
            ?: error("Button is not available on requested subpage: $requested")
        return allowed.singleOrNull()
            ?: error("Button requires explicit subpage; allowed=${allowed.joinToString(","){it.value}}")
    }
}
