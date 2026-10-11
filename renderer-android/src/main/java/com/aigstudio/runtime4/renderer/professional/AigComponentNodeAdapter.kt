package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.ui.*

data class AigPageLayout(
    val boundsByControlId:Map<String,UiBounds>,
    val labelsByKey:Map<String,String> = emptyMap(),
    val availableAssets:Set<String> = emptySet(),
    val baseZ:Int = 50,
    val skinRoleByControlId:Map<String,RgbSkinRole> = emptyMap(),
)


class AigLabelNode(
    id:String,
    bounds:UiBounds,
    z:Int,
    val text:String,
    visualState:VisualState=VisualState.NORMAL,
    visible:Boolean=true,
):SceneNode(id,bounds,z,visualState,false,visible)

class AigIconNode(
    id:String,
    bounds:UiBounds,
    z:Int,
    val textureRef:String?,
    visualState:VisualState=VisualState.NORMAL,
    visible:Boolean=true,
):SceneNode(id,bounds,z,visualState,false,visible)
object AigComponentNodeAdapter {
    fun nodes(descriptor:AigUiPageDescriptor,layout:AigPageLayout):List<SceneNode> =
        descriptor.components.filter{it.visible}.mapIndexed{index,component->
            val bounds=layout.boundsByControlId[component.controlId]
                ?: error("Missing professional bounds for ${component.controlId}")
            val visual=AigProfessionalTokens.visualState(component.state)
            val label=component.labelKey?.let{layout.labelsByKey[it] ?: it}
                ?: component.controlId.substringAfterLast('.')
            val texture=component.iconAsset?.takeIf{it in layout.availableAssets}
            val skinRole=layout.skinRoleByControlId[component.controlId] ?: AigProfessionalTokens.skinRole(component.kind)
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
                    skinRole=skinRole,
                    aigActionBinding=component.action,
                )
                AigUiKind.STATUS_CARD->RgbGlassButtonNode(
                    id=component.controlId,bounds=bounds,z=layout.baseZ+index,label=label,textureRef=texture,
                    commandBinding=null,visualState=visual,enabled=false,visible=component.visible,
                    skinRole=skinRole,aigActionBinding=null,
                )
                AigUiKind.PANEL,AigUiKind.VIEWPORT,AigUiKind.HUD,AigUiKind.CONTROL_DECK->
                    RgbGlassPanelNode(component.controlId,bounds,layout.baseZ+index,skinRole)
                AigUiKind.LABEL->AigLabelNode(component.controlId,bounds,layout.baseZ+index,label,visual,component.visible)
                AigUiKind.ICON->AigIconNode(component.controlId,bounds,layout.baseZ+index,texture,visual,component.visible)
            }
        }
}
