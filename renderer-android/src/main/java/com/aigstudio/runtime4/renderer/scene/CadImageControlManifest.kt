package com.aigstudio.runtime4.renderer

data class NormalizedRect(val left:Float,val top:Float,val right:Float,val bottom:Float)
data class CadImageControlSlot(val controlId:String,val rect:NormalizedRect)

/** Exact layout map for the user-selected 941x1672 CAD artwork. Visual pixels never own callbacks. */
object CadImageControlManifest {
    val controlSlots=listOf(
        CadImageControlSlot("CAD.UNDO",NormalizedRect(.2657f,.1423f,.3507f,.1956f)),
        CadImageControlSlot("CAD.REDO",NormalizedRect(.3507f,.1423f,.4357f,.1956f)),
        CadImageControlSlot("CAD.LINE",NormalizedRect(.0128f,.6065f,.1690f,.6699f)),
        CadImageControlSlot("CAD.RECT",NormalizedRect(.1775f,.6071f,.3294f,.6699f)),
        CadImageControlSlot("CAD.CIRCLE",NormalizedRect(.3443f,.6071f,.4931f,.6699f)),
        CadImageControlSlot("CAD.ARC",NormalizedRect(.5080f,.6071f,.6567f,.6693f)),
        CadImageControlSlot("CAD.HOLE",NormalizedRect(.6695f,.6071f,.8236f,.6699f)),
        CadImageControlSlot("CAD.CHAMFER",NormalizedRect(.8353f,.6071f,.9841f,.6693f)),
        CadImageControlSlot("CAD.FILLET",NormalizedRect(.0149f,.6758f,.1690f,.7404f)),
        CadImageControlSlot("CAD.TRIM",NormalizedRect(.1775f,.6758f,.3316f,.7404f)),
        CadImageControlSlot("CAD.EXTEND",NormalizedRect(.3422f,.6758f,.4952f,.7404f)),
        CadImageControlSlot("CAD.OFFSET",NormalizedRect(.5058f,.6758f,.6589f,.7404f)),
        CadImageControlSlot("CAD.ARRAY",NormalizedRect(.6695f,.6758f,.8236f,.7404f)),
        CadImageControlSlot("CAD.SELECT",NormalizedRect(.0149f,.9444f,.1233f,.9952f)),
        CadImageControlSlot("CAD.SNAP",NormalizedRect(.1318f,.9444f,.2465f,.9946f)),
        CadImageControlSlot("CAD.DIMENSION",NormalizedRect(.2540f,.9444f,.3698f,.9946f)),
        CadImageControlSlot("CAD.LAYERS",NormalizedRect(.3773f,.9444f,.4920f,.9946f)),
    )
    val viewport=NormalizedRect(.0128f,.1970f,.9841f,.5990f)
}
