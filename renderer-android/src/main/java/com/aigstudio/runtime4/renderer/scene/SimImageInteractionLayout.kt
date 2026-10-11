package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.ui.AigUiAction

/** Approved SIM artwork owns pixels; only real runtime controls receive hit regions. */
object SimImageInteractionLayout {
 fun imageBounds(widthPx:Float,heightPx:Float)=SimImagePixelMapper.imageBounds(widthPx,heightPx)
 fun controlAt(widthPx:Float,heightPx:Float,x:Float,y:Float):String?{
  val p=SimImagePixelMapper.screenToImagePixel(widthPx,heightPx,x,y) ?: return null
  return SimImagePixelManifest.controls.entries.firstOrNull{it.value.contains(p.x,p.y)}?.key
 }
 fun nodes(widthPx:Float,heightPx:Float):List<SceneNode>{
  val out=mutableListOf<SceneNode>()
  SimImagePixelManifest.navigation.forEachIndexed{index,spec->
   out+=RgbGlassButtonNode("IMG.SIM.NAV.${spec.page.name}",SimImagePixelMapper.pixelRectToScreen(widthPx,heightPx,spec.rect),3600+index,spec.page.name,null,null,
    aigActionBinding=AigUiAction.Navigate(spec.page),skinRole=RgbSkinRole.NAVIGATION)
  }
  val components=SimProfessionalDescriptor.descriptor().components.associateBy{it.controlId}
  SimImagePixelManifest.controls.entries.forEachIndexed{index,(id,rect)->
   val component=requireNotNull(components[id]){"Missing real SIM component $id"}
   out+=RgbGlassButtonNode(id,SimImagePixelMapper.pixelRectToScreen(widthPx,heightPx,rect),3700+index,id.substringAfter("SIM."),null,null,
    enabled=component.enabled,visible=component.visible,aigActionBinding=component.action,skinRole=RgbSkinRole.WORKSTATION_CONTROL)
  }
  out+=SceneNode("SIM.VIEWPORT",SimImagePixelMapper.pixelRectToScreen(widthPx,heightPx,SimImagePixelManifest.viewport),3500)
  return out
 }
}
