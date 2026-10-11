package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import com.aigstudio.runtime4.contract.ui.*

object SimProfessionalDescriptor {
    fun descriptor():AigUiPageDescriptor=AigUiPageDescriptor(PageId.SIM,listOf(
        AigUiComponent("SIM.CONTROL_DECK",AigUiKind.CONTROL_DECK,null,null,AigUiState.NORMAL,true,true,null),
        AigUiComponent("SIM.VIEWPORT.FRAME",AigUiKind.VIEWPORT,null,null,AigUiState.NORMAL,true,true,null),
        AigUiComponent("SIM.PLAY",AigUiKind.BUTTON,"sim.play",null,AigUiState.NORMAL,true,true,AigUiAction.Sim(AigSimCommand.RUN)),
        AigUiComponent("SIM.STEP",AigUiKind.BUTTON,"sim.step",null,AigUiState.NORMAL,true,true,AigUiAction.Sim(AigSimCommand.STEP)),
        AigUiComponent("SIM.RESET",AigUiKind.BUTTON,"sim.reset",null,AigUiState.NORMAL,true,true,AigUiAction.Sim(AigSimCommand.RESET)),
        AigUiComponent("SIM.DISPLAY",AigUiKind.BUTTON,"sim.display",null,AigUiState.NORMAL,true,true,AigUiAction.Sim(AigSimCommand.TOGGLE_DISPLAY)),
    ))
}
