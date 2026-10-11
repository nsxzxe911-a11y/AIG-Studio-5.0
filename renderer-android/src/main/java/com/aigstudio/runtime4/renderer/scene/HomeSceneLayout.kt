package com.aigstudio.runtime4.renderer

import kotlin.math.max

object HomeSceneLayout {
    private val assets=setOf(
        "aig-rgb/home/workspace.png","aig-rgb/home/cad.png","aig-rgb/home/cam.png","aig-rgb/home/tool_group.png",
        "aig-rgb/home/sim.png","aig-rgb/home/3ax.png","aig-rgb/home/4ax.png",
        "aig-rgb/home/5ax.png","aig-rgb/home/nc.png","aig-rgb/home/ai.png",
    )

    fun nodes(
        widthPx:Float,
        heightPx:Float,
        density:Float,
        presentation:HomeLivePresentation=HomeLivePresentation.localOnly(),
        localeId:String="zh-TW",
    ):List<SceneNode> = AigComponentNodeAdapter.nodes(
        HomeProfessionalDescriptor.descriptor(),layout(widthPx,heightPx,density,presentation,localeId),
    )

    fun layout(
        widthPx:Float,
        heightPx:Float,
        density:Float,
        presentation:HomeLivePresentation=HomeLivePresentation.localOnly(),
        localeId:String="zh-TW",
    ):AigPageLayout {
        val gap=SharedVisualPolicy.gapPx(density)
        val touch=SharedVisualPolicy.touchPx(density)
        val landscape=widthPx>=heightPx
        val bounds=linkedMapOf<String,UiBounds>()
        val roles=linkedMapOf<String,RgbSkinRole>()

        val headerTop=gap
        val headerH=if(landscape)touch else touch*1.05f
        val header=UiBounds(gap,headerTop,widthPx-gap,headerTop+headerH)
        bounds["HOME.HEADER"]=header;roles["HOME.HEADER"]=RgbSkinRole.HOME_PANEL
        bounds["HOME.TITLE"]=UiBounds(header.left+gap,header.top+touch*0.08f,header.left+header.width*0.38f,header.bottom-touch*0.08f)
        bounds["HOME.RUNTIME"]=UiBounds(header.left+header.width*0.39f,header.top+touch*0.08f,header.left+header.width*0.61f,header.bottom-touch*0.08f)
        bounds["HOME.HEADER.MACHINE"]=UiBounds(header.left+header.width*0.62f,header.top+touch*0.08f,header.left+header.width*0.80f,header.bottom-touch*0.08f)
        bounds["HOME.HEADER.PROJECT"]=UiBounds(header.left+header.width*0.81f,header.top+touch*0.08f,header.right-gap,header.bottom-touch*0.08f)

        val navIds=listOf("NAV.HOME","NAV.CAD","NAV.CAM","NAV.SIM","NAV.3AX","NAV.4AX","NAV.5AX","NAV.6AX","NAV.NC","NAV.AI")
        val navCols=if(landscape)10 else 5
        val navRows=(navIds.size+navCols-1)/navCols
        val navTop=header.bottom+gap
        val navW=(widthPx-gap*(navCols+1))/navCols
        navIds.forEachIndexed{index,id->
            val row=index/navCols;val col=index%navCols
            val left=gap+col*(navW+gap);val top=navTop+row*(touch+gap)
            bounds[id]=UiBounds(left,top,left+navW,top+touch);roles[id]=RgbSkinRole.HOME_NAV
        }
        val contentTop=navTop+navRows*touch+(navRows-1)*gap+gap
        val contentBottom=heightPx-gap

        fun panel(id:String,box:UiBounds,titleId:String){
            bounds[id]=box;roles[id]=RgbSkinRole.HOME_PANEL
            bounds[titleId]=UiBounds(box.left+gap,box.top+gap,box.right-gap,box.top+gap+touch*0.42f)
        }
        fun grid(ids:List<String>,box:UiBounds,columns:Int,titleBand:Float,interactive:Boolean){
            val rows=max(1,(ids.size+columns-1)/columns)
            val innerLeft=box.left+gap;val innerRight=box.right-gap
            val innerTop=box.top+titleBand;val innerBottom=box.bottom-gap
            val cellW=(innerRight-innerLeft-gap*(columns-1))/columns
            val cellH=(innerBottom-innerTop-gap*(rows-1))/rows
            ids.forEachIndexed{index,id->
                val row=index/columns;val col=index%columns
                val left=innerLeft+col*(cellW+gap);val top=innerTop+row*(cellH+gap)
                bounds[id]=UiBounds(left,top,left+cellW,top+cellH)
                if(interactive)roles[id]=RgbSkinRole.HOME_ACTION
            }
        }
        val titleBand=touch*0.52f+gap*1.6f

        if(!landscape){
            val usable=(contentBottom-contentTop-gap*3).coerceAtLeast(touch*7f)
            val connectionH=usable*0.17f
            val actionH=usable*0.32f
            val lowerH=usable*0.25f
            val bottomH=usable-connectionH-actionH-lowerH

            val connections=UiBounds(gap,contentTop,widthPx-gap,contentTop+connectionH)
            panel("HOME.CONNECTIONS.PANEL",connections,"HOME.CONNECTIONS.TITLE")
            grid(listOf("HOME.CONNECTIONS.CAD","HOME.CONNECTIONS.CAM","HOME.CONNECTIONS.SIM","HOME.CONNECTIONS.NC","HOME.CONNECTIONS.AI","HOME.CONNECTIONS.CLOUD"),connections,3,titleBand,false)

            val actionTop=connections.bottom+gap
            val halfW=(widthPx-gap*3)/2f
            val quick=UiBounds(gap,actionTop,gap+halfW,actionTop+actionH)
            val one=UiBounds(quick.right+gap,actionTop,widthPx-gap,actionTop+actionH)
            panel("HOME.QUICK.PANEL",quick,"HOME.QUICK.TITLE")
            panel("HOME.ONECLICK.PANEL",one,"HOME.ONECLICK.TITLE")
            grid(listOf("HOME.QUICK.CAD","HOME.QUICK.CAM","HOME.QUICK.SIM","HOME.QUICK.MULTI","HOME.QUICK.NC","HOME.QUICK.AI"),quick,3,titleBand,true)
            grid(listOf("HOME.ONECLICK.CAD","HOME.ONECLICK.CAM","HOME.ONECLICK.SIM","HOME.ONECLICK.NC","HOME.ONECLICK.AI"),one,3,titleBand,true)

            val lowerTop=quick.bottom+gap
            val fileW=(widthPx-gap*3)*0.58f
            val files=UiBounds(gap,lowerTop,gap+fileW,lowerTop+lowerH)
            val system=UiBounds(files.right+gap,lowerTop,widthPx-gap,lowerTop+lowerH)
            panel("HOME.FILES.PANEL",files,"HOME.FILES.TITLE")
            panel("HOME.SYSTEM.PANEL",system,"HOME.SYSTEM.TITLE")
            bounds["HOME.FILES.VALUE"]=UiBounds(files.left+gap,files.top+titleBand,files.right-gap,files.bottom-gap)
            bounds["HOME.SYSTEM.VALUE"]=UiBounds(system.left+gap,system.top+titleBand,system.right-gap,system.bottom-gap)

            val bottomTop=files.bottom+gap
            val thirdW=(widthPx-gap*4)/3f
            val tools=UiBounds(gap,bottomTop,gap+thirdW,contentBottom)
            val user=UiBounds(tools.right+gap,bottomTop,tools.right+gap+thirdW,contentBottom)
            val links=UiBounds(user.right+gap,bottomTop,widthPx-gap,contentBottom)
            panel("HOME.TOOLS.PANEL",tools,"HOME.TOOLS.TITLE")
            panel("HOME.USER.PANEL",user,"HOME.USER.TITLE")
            panel("HOME.LINKS.PANEL",links,"HOME.LINKS.TITLE")
            bounds["HOME.TOOLS.VALUE"]=UiBounds(tools.left+gap,tools.top+titleBand,tools.right-gap,tools.bottom-gap)
            bounds["HOME.USER.VALUE"]=UiBounds(user.left+gap,user.top+titleBand,user.right-gap,user.bottom-gap)
            bounds["HOME.LINKS.VALUE"]=UiBounds(links.left+gap,links.top+titleBand,links.right-gap,links.bottom-gap)
        } else {
            val usable=(contentBottom-contentTop-gap).coerceAtLeast(touch*4f)
            val upperH=usable*0.58f
            val lowerH=usable-upperH-gap
            val connectionW=widthPx*0.32f
            val connections=UiBounds(gap,contentTop,connectionW-gap,contentTop+upperH)
            panel("HOME.CONNECTIONS.PANEL",connections,"HOME.CONNECTIONS.TITLE")
            grid(listOf("HOME.CONNECTIONS.CAD","HOME.CONNECTIONS.CAM","HOME.CONNECTIONS.SIM","HOME.CONNECTIONS.NC","HOME.CONNECTIONS.AI","HOME.CONNECTIONS.CLOUD"),connections,2,titleBand,false)

            val quickLeft=connections.right+gap
            val quickW=(widthPx-quickLeft-gap)*0.52f
            val quick=UiBounds(quickLeft,contentTop,quickLeft+quickW,contentTop+upperH)
            val one=UiBounds(quick.right+gap,contentTop,widthPx-gap,contentTop+upperH)
            panel("HOME.QUICK.PANEL",quick,"HOME.QUICK.TITLE")
            panel("HOME.ONECLICK.PANEL",one,"HOME.ONECLICK.TITLE")
            grid(listOf("HOME.QUICK.CAD","HOME.QUICK.CAM","HOME.QUICK.SIM","HOME.QUICK.MULTI","HOME.QUICK.NC","HOME.QUICK.AI"),quick,3,titleBand,true)
            grid(listOf("HOME.ONECLICK.CAD","HOME.ONECLICK.CAM","HOME.ONECLICK.SIM","HOME.ONECLICK.NC","HOME.ONECLICK.AI"),one,2,titleBand,true)

            val lowerTop=contentTop+upperH+gap
            val lowerW=(widthPx-gap*5)/4f
            val files=UiBounds(gap,lowerTop,gap+lowerW,lowerTop+lowerH)
            val tools=UiBounds(files.right+gap,lowerTop,files.right+gap+lowerW,lowerTop+lowerH)
            val user=UiBounds(tools.right+gap,lowerTop,tools.right+gap+lowerW,lowerTop+lowerH)
            val system=UiBounds(user.right+gap,lowerTop,widthPx-gap,lowerTop+lowerH)
            panel("HOME.FILES.PANEL",files,"HOME.FILES.TITLE")
            panel("HOME.TOOLS.PANEL",tools,"HOME.TOOLS.TITLE")
            panel("HOME.USER.PANEL",user,"HOME.USER.TITLE")
            panel("HOME.SYSTEM.PANEL",system,"HOME.SYSTEM.TITLE")
            bounds["HOME.FILES.VALUE"]=UiBounds(files.left+gap,files.top+titleBand,files.right-gap,files.bottom-gap)
            bounds["HOME.TOOLS.VALUE"]=UiBounds(tools.left+gap,tools.top+titleBand,tools.right-gap,tools.bottom-gap)
            bounds["HOME.USER.VALUE"]=UiBounds(user.left+gap,user.top+titleBand,user.right-gap,user.bottom-gap)
            bounds["HOME.SYSTEM.VALUE"]=UiBounds(system.left+gap,system.top+titleBand,system.right-gap,system.bottom-gap)

            val links=UiBounds(system.left,system.bottom-touch*0.70f,system.right,system.bottom)
            bounds["HOME.LINKS.PANEL"]=links;roles["HOME.LINKS.PANEL"]=RgbSkinRole.HOME_PANEL
            bounds["HOME.LINKS.TITLE"]=UiBounds(links.left+gap,links.top+gap,links.left+links.width*0.44f,links.bottom-gap)
            bounds["HOME.LINKS.VALUE"]=UiBounds(links.left+links.width*0.46f,links.top+gap,links.right-gap,links.bottom-gap)
        }

        listOf(
            "HOME.CONNECTIONS.CAD","HOME.CONNECTIONS.CAM","HOME.CONNECTIONS.SIM",
            "HOME.CONNECTIONS.NC","HOME.CONNECTIONS.AI","HOME.CONNECTIONS.CLOUD",
        ).forEach{roles[it]=RgbSkinRole.HOME_STATUS}
        HomeProfessionalDescriptor.descriptor().components.forEach{component->
            if(component.controlId.startsWith("HOME.") && component.kind in setOf(com.aigstudio.runtime4.contract.ui.AigUiKind.PANEL,com.aigstudio.runtime4.contract.ui.AigUiKind.STATUS_CARD,com.aigstudio.runtime4.contract.ui.AigUiKind.VIEWPORT,com.aigstudio.runtime4.contract.ui.AigUiKind.CONTROL_DECK)){
                roles.putIfAbsent(component.controlId,RgbSkinRole.HOME_PANEL)
            }
        }
        return AigPageLayout(
            boundsByControlId=bounds,
            labelsByKey=presentation.labels(localeId),
            availableAssets=assets,
            baseZ=40,
            skinRoleByControlId=roles,
        )
    }
}
