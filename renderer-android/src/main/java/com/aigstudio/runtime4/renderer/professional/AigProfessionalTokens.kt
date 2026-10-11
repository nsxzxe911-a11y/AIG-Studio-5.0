package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.ui.AigUiKind
import com.aigstudio.runtime4.contract.ui.AigUiState

object AigProfessionalTokens {
    fun visualState(state:AigUiState):VisualState=when(state){
        AigUiState.NORMAL->VisualState.NORMAL
        AigUiState.PRESSED->VisualState.PRESSED
        AigUiState.SELECTED->VisualState.SELECTED
        AigUiState.DISABLED->VisualState.DISABLED
        AigUiState.ALARM->VisualState.ALARM
    }

    fun skinRole(kind:AigUiKind):RgbSkinRole=when(kind){
        AigUiKind.NAV->RgbSkinRole.NAVIGATION
        AigUiKind.CARD->RgbSkinRole.CARD
        AigUiKind.PANEL,AigUiKind.STATUS_CARD,AigUiKind.VIEWPORT,AigUiKind.HUD,AigUiKind.CONTROL_DECK->RgbSkinRole.PANEL
        else->RgbSkinRole.CONTROL
    }
}
