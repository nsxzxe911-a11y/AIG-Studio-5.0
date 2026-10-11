package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.contract.ui.AigUiLocalization
import kotlin.math.max

object CadSceneLayout {
    private val layerPopup=CadLayer.entries.flatMap{listOf("CAD.LAYER.${it.name}","CAD.LAYER_VIS.${it.name}")}+"CAD.LAYER_ASSIGN"
    private val dimensionPopup=CadDimensionKind.entries.map{"CAD.DIM_KIND.${it.name}"}+listOf("CAD.DIM_VALUE.1","CAD.DIM_VALUE.5","CAD.DIM_VALUE.10","CAD.DIM_VALUE.25")
    private val assets=setOf(
        "aig-rgb/cad/line.png","aig-rgb/cad/rect.png","aig-rgb/cad/circle.png","aig-rgb/cad/arc.png",
        "aig-rgb/cad/hole.png","aig-rgb/cad/select.png","aig-rgb/cad/tool_group.png",
    )

    fun nodes(widthPx:Float,heightPx:Float,density:Float,toolGroupExpanded:Boolean,layerGroupExpanded:Boolean=false,dimensionGroupExpanded:Boolean=false):List<SceneNode>{
        val touch=SharedVisualPolicy.touchPx(density)
        val gap=4f*density
        val outer=4f*density
        val landscape=widthPx>heightPx
        val descriptor=CadProfessionalDescriptor.descriptor(toolGroupExpanded,layerGroupExpanded,dimensionGroupExpanded)
        val nav=ProfessionalTopNavigationLayout.layout(widthPx,heightPx,density,"NAV.CAD")
        val statusHeight=touch
        val statusTop=nav.bottom+gap
        val statusBottom=statusTop+statusHeight
        val bodyTop=statusBottom+gap
        val bodyBottom=heightPx-outer
        val toolbarWidth=touch+gap*2
        val toolbarLeft=outer
        val toolbarRight=toolbarLeft+toolbarWidth

        val inspectorBounds:UiBounds
        val frameBounds:UiBounds
        if(landscape){
            val inspectorWidth=(widthPx*0.18f).coerceIn(touch*2.4f,widthPx*0.24f)
            val inspectorRight=widthPx-outer
            val inspectorLeft=inspectorRight-inspectorWidth
            inspectorBounds=UiBounds(inspectorLeft,bodyTop,inspectorRight,bodyBottom)
            frameBounds=UiBounds(toolbarRight+gap,bodyTop,inspectorLeft-gap,bodyBottom)
        }else{
            val inspectorRows=3
            val inspectorHeight=(inspectorRows*touch+(inspectorRows+1)*gap).coerceAtMost((heightPx-bodyTop)*0.34f)
            val inspectorTop=bodyBottom-inspectorHeight
            inspectorBounds=UiBounds(toolbarRight+gap,inspectorTop,widthPx-outer,bodyBottom)
            frameBounds=UiBounds(toolbarRight+gap,bodyTop,widthPx-outer,inspectorTop-gap)
        }

        val bounds=linkedMapOf<String,UiBounds>()
        bounds["CAD.STATUS_STRIP"]=UiBounds(outer,statusTop,widthPx-outer,statusBottom)
        bounds["CAD.LEFT_TOOLBAR"]=UiBounds(toolbarLeft,bodyTop,toolbarRight,bodyBottom)
        bounds["CAD.INSPECTOR"]=inspectorBounds
        bounds["CAD.VIEWPORT.FRAME"]=frameBounds

        val drawing=CadProfessionalDescriptor.drawingIds.filter{id->descriptor.components.any{it.controlId==id&&it.visible}}
        val toolButtonWidth=toolbarWidth-gap*2
        drawing.forEachIndexed{index,id->
            val top=bodyTop+gap+index*(touch+gap)
            bounds[id]=UiBounds(toolbarLeft+gap,top,toolbarLeft+gap+toolButtonWidth,top+touch)
        }

        val inspectorControls=(CadProfessionalDescriptor.inspectorIds+CadProfessionalDescriptor.utilityIds+CadProfessionalDescriptor.advancedIds)
            .filter{id->descriptor.components.any{it.controlId==id&&it.visible}}
        val columns=if(landscape)2 else 4
        val innerLeft=inspectorBounds.left+gap
        val innerWidth=inspectorBounds.width-gap*2
        val buttonWidth=((innerWidth-gap*(columns-1))/columns).coerceAtLeast(touch)
        inspectorControls.forEachIndexed{index,id->
            val row=index/columns;val col=index%columns
            val left=innerLeft+col*(buttonWidth+gap);val top=inspectorBounds.top+gap+row*(touch+gap)
            bounds[id]=UiBounds(left,top,(left+buttonWidth).coerceAtMost(inspectorBounds.right-gap),top+touch)
        }

        val roles=buildMap<String,RgbSkinRole>{
            put("CAD.STATUS_STRIP",RgbSkinRole.WORKSTATION_PANEL)
            put("CAD.LEFT_TOOLBAR",RgbSkinRole.WORKSTATION_PANEL)
            put("CAD.INSPECTOR",RgbSkinRole.WORKSTATION_PANEL)
            put("CAD.VIEWPORT.FRAME",RgbSkinRole.WORKSTATION_PANEL)
            (CadProfessionalDescriptor.primaryIds+CadProfessionalDescriptor.advancedIds).forEach{put(it,RgbSkinRole.WORKSTATION_CONTROL)}
        }
        val pageLayout=AigPageLayout(
            boundsByControlId=bounds,
            labelsByKey=AigUiLocalization.labels("zh-TW"),
            availableAssets=assets,
            baseZ=20,
            skinRoleByControlId=roles,
        )
        val nodes=AigComponentNodeAdapter.nodes(descriptor,pageLayout).toMutableList<SceneNode>()
        val inset=2f*density
        nodes+=SceneNode("CAD.VIEWPORT",UiBounds(frameBounds.left+inset,frameBounds.top+inset,frameBounds.right-inset,frameBounds.bottom-inset),1)

        val popupAnchor=if(landscape)frameBounds else inspectorBounds
        val popupTop=popupAnchor.top+gap
        fun popupBounds(index:Int,countColumns:Int):UiBounds{
            val available=popupAnchor.width-gap*(countColumns+1)
            val b=max(touch,available/countColumns)
            val col=index%countColumns;val row=index/countColumns
            val left=popupAnchor.left+gap+col*(b+gap);val top=popupTop+row*(touch+gap)
            return UiBounds(left,top,(left+b).coerceAtMost(popupAnchor.right-gap),top+touch)
        }
        val layerColumns=if(landscape)5 else 4
        layerPopup.forEachIndexed{index,id->
            nodes+=RgbGlassButtonNode(id,popupBounds(index,layerColumns),70,layerLabel(id),null,commandFor(id),visible=layerGroupExpanded,skinRole=RgbSkinRole.WORKSTATION_CONTROL)
        }
        val dimColumns=if(landscape)5 else 4
        dimensionPopup.forEachIndexed{index,id->
            nodes+=RgbGlassButtonNode(id,popupBounds(index,dimColumns),70,dimensionLabel(id),null,null,visible=dimensionGroupExpanded,skinRole=RgbSkinRole.WORKSTATION_CONTROL)
        }
        nodes+=nav.buttons
        return nodes
    }

    fun commandFor(id:String):CadCommand?{
        if(id.startsWith("CAD.LAYER_VIS."))return CadCommand.ToggleLayerVisibility(CadLayer.valueOf(id.substringAfter("CAD.LAYER_VIS.")))
        if(id.startsWith("CAD.LAYER."))return CadCommand.SetActiveLayer(CadLayer.valueOf(id.substringAfter("CAD.LAYER.")))
        return when(id){
            "CAD.LINE"->CadCommand.SelectTool(CadTool.LINE)
            "CAD.RECT"->CadCommand.SelectTool(CadTool.RECT)
            "CAD.CIRCLE"->CadCommand.SelectTool(CadTool.CIRCLE)
            "CAD.ARC"->CadCommand.SelectTool(CadTool.ARC)
            "CAD.ARC_DIR"->CadCommand.ToggleArcDirection
            "CAD.HOLE"->CadCommand.SelectTool(CadTool.HOLE)
            "CAD.SELECT"->CadCommand.SelectTool(CadTool.SELECT)
            "CAD.UNDO"->CadCommand.Undo
            "CAD.REDO"->CadCommand.Redo
            "CAD.SNAP"->CadCommand.CycleSnap
            "CAD.TRIM"->CadCommand.Trim
            "CAD.EXTEND"->CadCommand.Extend
            "CAD.OFFSET"->CadCommand.Offset(5.0)
            "CAD.ARRAY"->CadCommand.Array(3,10.0,0.0)
            "CAD.CHAMFER"->CadCommand.Chamfer(5.0)
            "CAD.FILLET"->CadCommand.Fillet(5.0)
            "CAD.TOPOLOGY"->CadCommand.ToggleTopology
            else->null
        }
    }

    private fun layerLabel(id:String)=when{
        id=="CAD.LAYER_ASSIGN"->"ASSIGN ACTIVE"
        id.startsWith("CAD.LAYER_VIS.")->"VIS "+id.substringAfter("CAD.LAYER_VIS.")
        id.startsWith("CAD.LAYER.")->"ACTIVE "+id.substringAfter("CAD.LAYER.")
        else->id.substringAfter("CAD.")
    }
    private fun dimensionLabel(id:String)=when{
        id.startsWith("CAD.DIM_KIND.")->id.substringAfter("CAD.DIM_KIND.")
        id.startsWith("CAD.DIM_VALUE.")->id.substringAfter("CAD.DIM_VALUE.")+" mm"
        else->id.substringAfter("CAD.")
    }
}
