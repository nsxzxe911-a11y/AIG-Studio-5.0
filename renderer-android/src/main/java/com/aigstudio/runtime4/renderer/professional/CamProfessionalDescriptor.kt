package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.contract.ui.*

object CamProfessionalDescriptor {
    val controlIds=listOf(
        "CAM.MANUAL","CAM.AUTO","CAM.PREVIEW","CAM.SOURCE_LINK","CAM.TOOLPATH_LINK",
        "CAM.TOOL","CAM.DIAMETER","CAM.DEPTH","CAM.SAFE_Z","CAM.FEED","CAM.SPEED",
        "CAM.SIDE","CAM.DIRECTION","CAM.LEAD_IN","CAM.LEAD_OUT","CAM.REGION",
        "CAM.ADD","CAM.EDIT","CAM.CUT_EDIT","CAM.AVOID","CAM.FIXTURE","CAM.FREEZE","CAM.KEEP","CAM.ADOPT","CAM.SAVE"
    )

    fun descriptor(state:CamState):AigUiPageDescriptor {
        val controls=controlIds.map{id->
            val selected=when(id){
                "CAM.SOURCE_LINK"->state.sourceLink==CamSourceLinkState.CONNECTED
                "CAM.TOOLPATH_LINK"->state.toolpathLink==CamToolpathLinkState.CONNECTED
                "CAM.FREEZE"->state.active?.frozen==true
                "CAM.PREVIEW"->state.previewCandidateId!=null
                else->false
            }
            AigUiComponent(
                controlId=id,
                kind=AigUiKind.BUTTON,
                labelKey="cam."+id.substringAfter("CAM.").lowercase(),
                iconAsset=if(id=="CAM.AUTO"||id=="CAM.MANUAL")"aig-rgb/cam/cam.png" else null,
                state=if(selected)AigUiState.SELECTED else AigUiState.NORMAL,
                enabled=true,
                visible=true,
                action=AigUiAction.Cam(requireNotNull(CamSceneLayout.commandFor(id,state)){"Missing CAM command for $id"}),
            )
        }
        return AigUiPageDescriptor(PageId.CAM,listOf(
            AigUiComponent("CAM.CONTROL_DECK",AigUiKind.CONTROL_DECK,null,null,AigUiState.NORMAL,true,true,null),
            AigUiComponent("CAM.VIEWPORT.FRAME",AigUiKind.VIEWPORT,null,null,AigUiState.NORMAL,true,true,null),
        )+controls)
    }
}
