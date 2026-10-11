package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId

data class SimImagePixelPoint(val x:Float,val y:Float)
data class SimImagePixelRect(val left:Float,val top:Float,val right:Float,val bottom:Float){
 val width:Float get()=right-left
 val height:Float get()=bottom-top
 fun contains(x:Float,y:Float)=x>=left&&x<=right&&y>=top&&y<=bottom
}
data class SimImageNavSlot(val page:PageId,val rect:SimImagePixelRect)

object SimImagePixelManifest {
 const val referenceWidth=941f
 const val referenceHeight=1672f
 const val expectedSha256="c78fc52cf46e2778616469fb56137b667548e03648ac68c9e667e908f3de3d12"
 fun isCompatibleSha(actual:String?)=actual?.trim()?.lowercase()==expectedSha256
 fun sha256(bytes:ByteArray)=java.security.MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}
 fun isCompatibleBytes(bytes:ByteArray)=isCompatibleSha(sha256(bytes))
 // Main navigation is shared by HomeImageNavigationLayout; no duplicate SIM-specific hitboxes.
 val navigation=emptyList<SimImageNavSlot>()
 val controls=linkedMapOf(
  "SIM.DISPLAY" to SimImagePixelRect(14f,1392f,233f,1536f),
  "SIM.RESET" to SimImagePixelRect(240f,1392f,466f,1536f),
  "SIM.PLAY" to SimImagePixelRect(473f,1392f,693f,1536f),
  "SIM.STEP" to SimImagePixelRect(700f,1392f,925f,1536f),
 )
 // Replace every baked demo number with real SimState.
 val liveStatus=SimImagePixelRect(18f,1040f,923f,1368f)
 val viewport=SimImagePixelRect(20f,522f,921f,1033f)
}

object SimImagePixelMapper {
 private fun transform(screenWidth:Float,screenHeight:Float)=
  AdaptivePageTransform.forViewport(SimImagePixelManifest.referenceWidth,SimImagePixelManifest.referenceHeight,screenWidth,screenHeight)
 fun imageBounds(screenWidth:Float,screenHeight:Float):UiBounds=transform(screenWidth,screenHeight).bounds
 fun screenToImagePixel(screenWidth:Float,screenHeight:Float,x:Float,y:Float):SimImagePixelPoint?=
  transform(screenWidth,screenHeight).screenToSource(x,y)?.let{SimImagePixelPoint(it.x,it.y)}
 fun imagePixelToScreen(screenWidth:Float,screenHeight:Float,x:Float,y:Float):SimImagePixelPoint=
  transform(screenWidth,screenHeight).sourceToScreen(x,y).let{SimImagePixelPoint(it.x,it.y)}
 fun pixelRectToScreen(screenWidth:Float,screenHeight:Float,r:SimImagePixelRect):UiBounds=
  transform(screenWidth,screenHeight).sourceRectToScreen(ImagePixelRect(r.left,r.top,r.right,r.bottom))
}
