package com.aigstudio.runtime4.contract.ui

enum class AigUiKind {
    BUTTON,
    NAV,
    CARD,
    PANEL,
    STATUS_CARD,
    VIEWPORT,
    HUD,
    CONTROL_DECK,
    ICON,
    LABEL,
}

enum class AigUiState { NORMAL, PRESSED, SELECTED, DISABLED, ALARM }

data class AigUiComponent(
    val controlId:String,
    val kind:AigUiKind,
    val labelKey:String?,
    val iconAsset:String?,
    val state:AigUiState,
    val enabled:Boolean,
    val visible:Boolean,
    val action:AigUiAction?,
){
    init {
        require(controlId.isNotBlank()) { "AIG UI controlId is blank" }
        require(labelKey==null || labelKey.isNotBlank()) { "AIG UI labelKey is blank for $controlId" }
        if(visible && kind in setOf(AigUiKind.BUTTON,AigUiKind.NAV,AigUiKind.CARD)) {
            require(action!=null) { "Visible interactive component has no action: $controlId" }
        }
        if(visible && kind==AigUiKind.LABEL) {
            require(!labelKey.isNullOrBlank()) { "Visible label has no localization key: $controlId" }
        }
    }
}
