package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId

data class CadImagePixelPoint(val x:Float,val y:Float)
data class CadImagePixelRect(val left:Float,val top:Float,val right:Float,val bottom:Float) {
 val width:Float get()=right-left
 val height:Float get()=bottom-top
 fun contains(x:Float,y:Float):Boolean=x>=left&&x<=right&&y>=top&&y<=bottom
}
data class CadImageNavPixelSlot(val page:PageId,val rect:CadImagePixelRect)

/** SHA-bound interaction geometry for the approved 856x1836 CAD preview artwork. */
object CadImagePixelManifest {
 const val referenceWidth=856f
 const val referenceHeight=1836f
 const val expectedSha256="742d9fbe1f92f004712dab6f4011160954b83d21789c37cf3db58c2ce9662b10"
 fun isCompatibleSha(actual:String?):Boolean=actual?.trim()?.lowercase()==expectedSha256
 fun sha256(bytes:ByteArray):String=java.security.MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}
 fun isCompatibleBytes(bytes:ByteArray)=isCompatibleSha(sha256(bytes))

 // Global navigation is owned by PrimaryPageNavigationLayout.
 val navigation=emptyList<CadImageNavPixelSlot>()
 val controls=linkedMapOf(
  "CAD.SELECT" to CadImagePixelRect(18f,493f,94f,585f),
  "CAD.LINE" to CadImagePixelRect(98f,493f,158f,585f),
  "CAD.RECT" to CadImagePixelRect(160f,493f,222f,585f),
  "CAD.CIRCLE" to CadImagePixelRect(224f,493f,288f,585f),
  "CAD.ARC" to CadImagePixelRect(290f,493f,353f,585f),
  "CAD.HOLE" to CadImagePixelRect(355f,493f,416f,585f),
  "CAD.CHAMFER" to CadImagePixelRect(418f,493f,480f,585f),
  "CAD.FILLET" to CadImagePixelRect(482f,493f,544f,585f),
  "CAD.DIMENSION" to CadImagePixelRect(675f,493f,742f,585f),
  "CAD.TRIM" to CadImagePixelRect(776f,493f,840f,585f),
 )
 val viewport=CadImagePixelRect(18f,592f,838f,1126f)
}

object CadImagePixelMapper {
 private fun transform(screenWidth:Float,screenHeight:Float)=
  AdaptivePageTransform.forViewport(CadImagePixelManifest.referenceWidth,CadImagePixelManifest.referenceHeight,screenWidth,screenHeight)
 fun imageBounds(screenWidth:Float,screenHeight:Float):UiBounds=transform(screenWidth,screenHeight).bounds
 fun screenToImagePixel(screenWidth:Float,screenHeight:Float,x:Float,y:Float):CadImagePixelPoint?=
  transform(screenWidth,screenHeight).screenToSource(x,y)?.let{CadImagePixelPoint(it.x,it.y)}
 fun imagePixelToScreen(screenWidth:Float,screenHeight:Float,x:Float,y:Float):CadImagePixelPoint=
  transform(screenWidth,screenHeight).sourceToScreen(x,y).let{CadImagePixelPoint(it.x,it.y)}
 fun pixelRectToScreen(screenWidth:Float,screenHeight:Float,r:CadImagePixelRect):UiBounds=
  transform(screenWidth,screenHeight).sourceRectToScreen(ImagePixelRect(r.left,r.top,r.right,r.bottom))
}
