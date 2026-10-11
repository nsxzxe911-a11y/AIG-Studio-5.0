package com.aigstudio.runtime4.renderer

/** Exact image-pixel mapping: artwork owns visuals, real runtime modules own actions. */
object CadImageInteractionLayout {
 fun referenceAspectRatio():Float=CadImagePixelManifest.referenceWidth/CadImagePixelManifest.referenceHeight
 fun imageBounds(widthPx:Float,heightPx:Float):UiBounds=CadImagePixelMapper.imageBounds(widthPx,heightPx)
 fun nodes(widthPx:Float,heightPx:Float):List<SceneNode>{
  val out=mutableListOf<SceneNode>()
  val components=CadImagePixelManifest.controls.keys.associateWith{id->requireNotNull(CadImageModuleCatalog.component(id)){"Missing real CAD component $id"}}
  CadImagePixelManifest.controls.entries.forEachIndexed{index,(id,rect)->
   val component=components.getValue(id)
   out+=RgbGlassButtonNode(
    id=id,
    bounds=CadImagePixelMapper.pixelRectToScreen(widthPx,heightPx,rect),
    z=2600+index,
    label=id.substringAfter("CAD."),
    textureRef=null,
    commandBinding=null,
    enabled=component.enabled,
    visible=component.visible,
    aigActionBinding=component.action,
    skinRole=RgbSkinRole.WORKSTATION_CONTROL,
   )
  }
  out+=SceneNode("CAD.VIEWPORT",CadImagePixelMapper.pixelRectToScreen(widthPx,heightPx,CadImagePixelManifest.viewport),2500)
  return out
 }
}
