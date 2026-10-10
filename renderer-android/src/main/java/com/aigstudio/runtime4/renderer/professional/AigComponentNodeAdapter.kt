package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.ui.*

data class AigPageLayout(
    val boundsByControlId:Map<String,UiBounds>,
    val labelsByKey:Map<String,String> = emptyMap(),
    val availableAssets:Set<String> = emptySet(),
    val baseZ:Int = 50,
)

object AigComponentNodeAdapter {
    fun nodes(descriptor:AigUiPageDescriptor,layout:AigPageLayout):List<SceneNode> =
        descriptor.components.filter{it.visible}.mapIndexed{index,component->
            val bounds=layout.boundsByControlId[component.controlId]
                ?: error("Missing professional bounds for ${component.controlId}")
            val visual=AigProfessionalTokens.visualState(component.state)
            val label=component.labelKey?.let{layout.labelsByKey[it] ?: it}
                ?: component.controlId.substringAfterLast('.')
            val texture=component.iconAsset?.takeIf{it in layout.availableAssets}
            when(component.kind){
                AigUiKind.BUTTON,AigUiKind.NAV,AigUiKind.CARD->RgbGlassButtonNode(
                    id=component.controlId,
                    bounds=bounds,
                    z=layout.baseZ+index,
                    label=label,
                    textureRef=texture,
                    commandBinding=(component.action as? AigUiAction.Cad)?.command,
                    visualState=visual,
                    enabled=component.enabled,
                    visible=component.visible,
                    camCommandBinding=(component.action as? AigUiAction.Cam)?.command,
                    ncCommandBinding=(component.action as? AigUiAction.Nc)?.command,
                    skinRole=AigProfessionalTokens.skinRole(component.kind),
                    aigActionBinding=component.action,
                )
                AigUiKind.PANEL,AigUiKind.STATUS_CARD,AigUiKind.VIEWPORT,AigUiKind.HUD,AigUiKind.CONTROL_DECK->
                    RgbGlassPanelNode(component.controlId,bounds,layout.baseZ+index,AigProfessionalTokens.skinRole(component.kind))
                AigUiKind.ICON,AigUiKind.LABEL->SceneNode(
                    component.controlId,bounds,layout.baseZ+index,visual,false,true,
                )
            }
        }
}
