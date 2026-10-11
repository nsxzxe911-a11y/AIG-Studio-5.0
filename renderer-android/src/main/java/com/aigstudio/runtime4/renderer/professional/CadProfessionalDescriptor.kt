package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.contract.ui.*

object CadProfessionalDescriptor {
    val drawingIds=listOf("CAD.LINE","CAD.RECT","CAD.CIRCLE","CAD.ARC","CAD.HOLE","CAD.SELECT")
    val inspectorIds=listOf("CAD.SNAP","CAD.LAYERS","CAD.DIMENSION","CAD.TRIM","CAD.EXTEND","CAD.OFFSET","CAD.ARRAY")
    val utilityIds=listOf("CAD.UNDO","CAD.REDO","CAD.ARC_DIR","CAD.TOOL_GROUP")
    val advancedIds=listOf("CAD.CHAMFER","CAD.FILLET","CAD.TOPOLOGY")
    val primaryIds=drawingIds+inspectorIds+utilityIds

    private fun action(id:String):AigUiAction = when(id){
        "CAD.TOOL_GROUP","CAD.LAYERS","CAD.DIMENSION"->AigUiAction.Local(AigLocalUiCommand.TOGGLE_CONTROL_GROUP)
        else->AigUiAction.Cad(requireNotNull(CadSceneLayout.commandFor(id)){"Missing CAD command for $id"})
    }

    private fun icon(id:String):String?=when(id){
        "CAD.LINE"->"aig-rgb/cad/line.png"
        "CAD.RECT"->"aig-rgb/cad/rect.png"
        "CAD.CIRCLE"->"aig-rgb/cad/circle.png"
        "CAD.ARC"->"aig-rgb/cad/arc.png"
        "CAD.HOLE"->"aig-rgb/cad/hole.png"
        "CAD.SELECT"->"aig-rgb/cad/select.png"
        "CAD.TOOL_GROUP"->"aig-rgb/cad/tool_group.png"
        else->null
    }

    fun descriptor(toolGroupExpanded:Boolean,layerGroupExpanded:Boolean,dimensionGroupExpanded:Boolean):AigUiPageDescriptor {
        val controls=(primaryIds+advancedIds).map{id->AigUiComponent(
            controlId=id,kind=AigUiKind.BUTTON,
            labelKey="cad."+id.substringAfter("CAD.").lowercase(),iconAsset=icon(id),
            state=AigUiState.NORMAL,enabled=true,
            visible=id in primaryIds || toolGroupExpanded,action=action(id),
        )}
        return AigUiPageDescriptor(PageId.CAD,listOf(
            AigUiComponent("CAD.STATUS_STRIP",AigUiKind.PANEL,null,null,AigUiState.NORMAL,true,true,null),
            AigUiComponent("CAD.LEFT_TOOLBAR",AigUiKind.PANEL,null,null,AigUiState.NORMAL,true,true,null),
            AigUiComponent("CAD.INSPECTOR",AigUiKind.PANEL,null,null,AigUiState.NORMAL,true,true,null),
            AigUiComponent("CAD.VIEWPORT.FRAME",AigUiKind.VIEWPORT,null,null,AigUiState.NORMAL,true,true,null),
        )+controls)
    }
}
