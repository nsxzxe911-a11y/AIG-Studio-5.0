package com.aigstudio.runtime4.contract.ui

import com.aigstudio.runtime4.contract.*

enum class AigSimCommand { RUN, STEP, RESET, TOGGLE_DISPLAY }

enum class AigLocalUiCommand {
    TOGGLE_CONTROL_GROUP,
    OPEN_SETTINGS,
    RESET_VIEW,
    ZOOM_IN,
    ZOOM_OUT,
    ORBIT_LEFT,
    ORBIT_RIGHT,
}

sealed interface AigUiAction {
    data class Navigate(val page:PageId):AigUiAction
    data class Cad(val command:CadCommand):AigUiAction
    data class Cam(val command:CamCommand):AigUiAction
    data class Nc(val command:NcCommand):AigUiAction
    data class Ai(val command:AiCommand):AigUiAction
    data class Sim(val command:AigSimCommand):AigUiAction
    data class SetConnection(
        val source:PageId,
        val target:PageId,
        val connected:Boolean,
    ):AigUiAction {
        init { require(source!=target) { "AIG UI connection cannot target the same page" } }
    }
    data class Local(val command:AigLocalUiCommand):AigUiAction
}
