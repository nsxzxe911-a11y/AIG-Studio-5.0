package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.CamState
import com.aigstudio.runtime4.contract.ui.AigUiAction

/** User-saved CAM artwork owns pixels; only exact-SHA real runtime controls receive hit regions. */
object CamImageInteractionLayout {
    fun imageBounds(widthPx:Float,heightPx:Float)=ImagePixelMapper.imageBounds(CamImagePixelManifest.spec,widthPx,heightPx)

    fun controlAt(widthPx:Float,heightPx:Float,x:Float,y:Float):String? {
        val p=ImagePixelMapper.screenToImagePixel(CamImagePixelManifest.spec,widthPx,heightPx,x,y) ?: return null
        return CamImagePixelManifest.controls.entries.firstOrNull{it.value.contains(p.x,p.y)}?.key
    }

    fun nodes(widthPx:Float,heightPx:Float,state:CamState):List<SceneNode> {
        val out=mutableListOf<SceneNode>()
        CamImagePixelManifest.navigation.forEachIndexed { index,slot ->
            out+=RgbGlassButtonNode(
                "IMG.CAM.NAV.${slot.page.name}",
                ImagePixelMapper.pixelRectToScreen(CamImagePixelManifest.spec,widthPx,heightPx,slot.rect),
                4600+index,slot.page.name,null,null,
                aigActionBinding=AigUiAction.Navigate(slot.page),skinRole=RgbSkinRole.NAVIGATION,
            )
        }
        val components=CamProfessionalDescriptor.descriptor(state).components.associateBy{it.controlId}
        CamImagePixelManifest.controls.entries.forEachIndexed { index,(id,rect) ->
            val component=requireNotNull(components[id]){"Missing real CAM component $id"}
            out+=RgbGlassButtonNode(
                id,
                ImagePixelMapper.pixelRectToScreen(CamImagePixelManifest.spec,widthPx,heightPx,rect),
                4700+index,id.substringAfter("CAM."),null,null,
                enabled=component.enabled,visible=component.visible,
                aigActionBinding=component.action,skinRole=RgbSkinRole.WORKSTATION_CONTROL,
            )
        }
        out+=SceneNode(
            "CAM.VIEWPORT",
            ImagePixelMapper.pixelRectToScreen(CamImagePixelManifest.spec,widthPx,heightPx,CamImagePixelManifest.viewport),
            4500,
        )
        return out
    }
}
