package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import kotlin.math.max

object CadSceneLayout {
    private val primary = listOf("CAD.LINE","CAD.RECT","CAD.CIRCLE","CAD.ARC","CAD.ARC_DIR","CAD.HOLE","CAD.SELECT","CAD.UNDO","CAD.REDO","CAD.SNAP","CAD.TOOL_GROUP","CAD.LAYERS")
    private val advanced = listOf("CAD.TRIM","CAD.EXTEND","CAD.OFFSET","CAD.ARRAY","CAD.CHAMFER","CAD.FILLET","CAD.TOPOLOGY")
    private val layerPopup = CadLayer.entries.flatMap { layer ->
        listOf("CAD.LAYER.${layer.name}","CAD.LAYER_VIS.${layer.name}")
    } + "CAD.LAYER_ASSIGN"

    fun nodes(widthPx:Float,heightPx:Float,density:Float,toolGroupExpanded:Boolean,layerGroupExpanded:Boolean=false):List<SceneNode> {
        val touch=48f*density
        val gap=8f*density
        val landscape=widthPx>heightPx
        val columns=if(landscape)8 else 5
        val button=max(touch,(widthPx-gap*(columns+1))/columns)
        fun bounds(index:Int):UiBounds {
            val col=index%columns; val row=index/columns
            val left=gap+col*(button+gap); val top=gap+row*(touch+gap)
            return UiBounds(left,top,left+button,top+touch)
        }
        val nodes=mutableListOf<SceneNode>()
        val baseTools=primary+advanced
        baseTools.forEachIndexed { index,id ->
            nodes += RgbGlassButtonNode(
                id=id,bounds=bounds(index),z=if(id in advanced)40 else 30,
                label=id.substringAfter("CAD."),textureRef=textureFor(id),
                commandBinding=commandFor(id),visible=id in primary || toolGroupExpanded,
            )
        }
        val rows=(baseTools.size+columns-1)/columns
        val toolbarBottom=gap+rows*(touch+gap)
        val layerColumns=if(landscape)7 else 3
        val layerButton=max(touch,(widthPx-gap*(layerColumns+1))/layerColumns)
        fun layerBounds(index:Int):UiBounds {
            val col=index%layerColumns; val row=index/layerColumns
            val left=gap+col*(layerButton+gap); val top=toolbarBottom+gap+row*(touch+gap)
            return UiBounds(left,top,left+layerButton,top+touch)
        }
        layerPopup.forEachIndexed { index,id ->
            nodes += RgbGlassButtonNode(
                id=id,bounds=layerBounds(index),z=45,label=layerLabel(id),textureRef=null,
                commandBinding=commandFor(id),visible=layerGroupExpanded,
            )
        }
        val navTop=heightPx-touch-gap
        nodes += SceneNode("CAD.VIEWPORT",UiBounds(gap,toolbarBottom,widthPx-gap,navTop-gap),1)
        nodes += RgbGlassButtonNode("NAV.HOME",UiBounds(gap,navTop,gap+touch,navTop+touch),50,"HOME","aig-rgb/icons/workspace.png",null)
        nodes += RgbGlassButtonNode("NAV.CAD",UiBounds(gap*2+touch,navTop,gap*2+touch*2,navTop+touch),50,"CAD","aig-rgb/icons/cad.png",null,VisualState.SELECTED)
        return nodes
    }

    fun commandFor(id:String):CadCommand? {
        if(id.startsWith("CAD.LAYER_VIS.")) return CadCommand.ToggleLayerVisibility(CadLayer.valueOf(id.substringAfter("CAD.LAYER_VIS.")))
        if(id.startsWith("CAD.LAYER.")) return CadCommand.SetActiveLayer(CadLayer.valueOf(id.substringAfter("CAD.LAYER.")))
        return when(id) {
            "CAD.LINE"->CadCommand.SelectTool(CadTool.LINE); "CAD.RECT"->CadCommand.SelectTool(CadTool.RECT)
            "CAD.CIRCLE"->CadCommand.SelectTool(CadTool.CIRCLE); "CAD.ARC"->CadCommand.SelectTool(CadTool.ARC)
            "CAD.ARC_DIR"->CadCommand.ToggleArcDirection; "CAD.HOLE"->CadCommand.SelectTool(CadTool.HOLE)
            "CAD.SELECT"->CadCommand.SelectTool(CadTool.SELECT); "CAD.UNDO"->CadCommand.Undo; "CAD.REDO"->CadCommand.Redo
            "CAD.SNAP"->CadCommand.CycleSnap; "CAD.TRIM"->CadCommand.Trim; "CAD.EXTEND"->CadCommand.Extend
            "CAD.OFFSET"->CadCommand.Offset(5.0); "CAD.ARRAY"->CadCommand.Array(3,10.0,0.0)
            "CAD.CHAMFER"->CadCommand.Chamfer(5.0); "CAD.FILLET"->CadCommand.Fillet(5.0)
            "CAD.TOPOLOGY"->CadCommand.ToggleTopology
            else->null
        }
    }

    private fun layerLabel(id:String):String = when {
        id=="CAD.LAYER_ASSIGN" -> "ASSIGN ACTIVE"
        id.startsWith("CAD.LAYER_VIS.") -> "VIS "+id.substringAfter("CAD.LAYER_VIS.")
        id.startsWith("CAD.LAYER.") -> "ACTIVE "+id.substringAfter("CAD.LAYER.")
        else -> id.substringAfter("CAD.")
    }

    private fun textureFor(id:String):String?=when(id){
        "CAD.LINE"->"aig-rgb/icons/line.png"; "CAD.RECT"->"aig-rgb/icons/rect.png"
        "CAD.CIRCLE"->"aig-rgb/icons/circle.png"; "CAD.HOLE"->"aig-rgb/icons/hole.png"
        "CAD.SELECT"->"aig-rgb/icons/select.png"; "CAD.TOOL_GROUP"->"aig-rgb/icons/tool_group.png"
        else->null
    }
}
