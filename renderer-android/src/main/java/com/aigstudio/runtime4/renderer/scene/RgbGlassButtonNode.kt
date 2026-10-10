package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.CadCommand
import com.aigstudio.runtime4.contract.CamCommand
import com.aigstudio.runtime4.contract.NcCommand

enum class RgbSkinRole { PANEL, CONTROL, NAVIGATION }

class RgbGlassPanelNode(id:String,bounds:UiBounds,z:Int,val skinRole:RgbSkinRole=RgbSkinRole.PANEL):SceneNode(id,bounds,z,VisualState.NORMAL,false,true)

class RgbGlassButtonNode(
    id:String,bounds:UiBounds,z:Int,val label:String,val textureRef:String?,val commandBinding:CadCommand?,
    visualState:VisualState=VisualState.NORMAL,enabled:Boolean=true,visible:Boolean=true,
    val camCommandBinding:CamCommand?=null,val ncCommandBinding:NcCommand?=null,
    val skinRole:RgbSkinRole=RgbSkinRole.CONTROL,
):SceneNode(id,bounds,z,visualState,enabled,visible){
    val usesFallback:Boolean get()=textureRef.isNullOrBlank()
}