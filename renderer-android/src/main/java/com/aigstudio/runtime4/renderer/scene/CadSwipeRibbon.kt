package com.aigstudio.runtime4.renderer

object CadSwipeRibbonModel {
    private val orderedControlIds=listOf(
        "CAD.LINE","CAD.RECT","CAD.CIRCLE","CAD.ARC",
        "CAD.HOLE","CAD.CHAMFER","CAD.FILLET","CAD.TRIM",
        "CAD.EXTEND","CAD.OFFSET","CAD.ARRAY","CAD.SELECT",
        "CAD.SNAP","CAD.DIMENSION","CAD.LAYERS","CAD.UNDO",
        "CAD.REDO","CAD.ARC_DIR","CAD.TOOL_GROUP","CAD.TOPOLOGY",
    )
    val pages:List<List<String>> = PageToolRibbonModel.pages(orderedControlIds,4)
    val pageCount:Int get()=pages.size
    fun label(id:String):String=when(id){
        "CAD.LINE"->"直線";"CAD.RECT"->"矩形";"CAD.CIRCLE"->"圓形";"CAD.ARC"->"圓弧"
        "CAD.HOLE"->"孔";"CAD.CHAMFER"->"倒角";"CAD.FILLET"->"圓角";"CAD.TRIM"->"修剪"
        "CAD.EXTEND"->"延伸";"CAD.OFFSET"->"偏移";"CAD.ARRAY"->"陣列";"CAD.SELECT"->"選取"
        "CAD.SNAP"->"捕捉";"CAD.DIMENSION"->"標註";"CAD.LAYERS"->"圖層";"CAD.UNDO"->"復原"
        "CAD.REDO"->"重做";"CAD.ARC_DIR"->"弧向";"CAD.TOOL_GROUP"->"工具";"CAD.TOPOLOGY"->"拓樸"
        else->id.substringAfter("CAD.")
    }
}

typealias CadSwipeGestureState = PageToolGestureState
typealias CadSwipeRelease = PageToolRelease

class CadSwipeRibbonState(initialPage:Int=0) {
    private val delegate=PageToolRibbonState(CadSwipeRibbonModel.pageCount,initialPage)
    val pageIndex:Int get()=delegate.pageIndex
    fun apply(release:CadSwipeRelease)=delegate.apply(release)
}

class CadSwipeGestureTracker(touchSlopPx:Float) {
    private val delegate=PageToolGestureTracker(touchSlopPx)
    val tapActivationId:String? get()=delegate.tapActivationId
    fun onDown(x:Float,y:Float,activationId:String?=null)=delegate.onDown(x,y,activationId)
    fun onMove(x:Float,y:Float):CadSwipeGestureState=delegate.onMove(x,y)
    fun onUp(x:Float,y:Float):CadSwipeRelease=delegate.onUp(x,y)
    fun cancel()=delegate.cancel()
}

object CadSwipeRibbonLayout {
    val panelPixelRect=CadImagePixelRect(0f,1004f,941f,1246f)
    private const val columns=4
    fun panelBounds(width:Float,height:Float)=CadImagePixelMapper.pixelRectToScreen(width,height,panelPixelRect)
    private fun visualPixelRect(column:Int):CadImagePixelRect{
        val margin=12f;val gap=8f;val totalGap=gap*(columns-1);val w=(941f-margin*2-totalGap)/columns
        val left=margin+column*(w+gap)
        return CadImagePixelRect(left,1026f,left+w,1232f)
    }
    fun controlAt(width:Float,height:Float,pageIndex:Int,x:Float,y:Float):String?{
        val ids=CadSwipeRibbonModel.pages[pageIndex.coerceIn(0,CadSwipeRibbonModel.pageCount-1)]
        return PageToolRibbonLayout.controlAt(panelBounds(width,height),ids,x,y,0f)
    }
    fun nodes(width:Float,height:Float,pageIndex:Int,density:Float):List<RgbGlassButtonNode>{
        val ids=CadSwipeRibbonModel.pages[pageIndex.coerceIn(0,CadSwipeRibbonModel.pageCount-1)]
        return ids.mapIndexed{i,id->
            val module=requireNotNull(CadImageModuleCatalog.component(id)){"Missing CAD module $id"}
            RgbGlassButtonNode(id,CadImagePixelMapper.pixelRectToScreen(width,height,visualPixelRect(i)),3200+i,CadSwipeRibbonModel.label(id),module.iconAsset,null,
                enabled=module.enabled,visible=true,aigActionBinding=module.action,skinRole=RgbSkinRole.WORKSTATION_CONTROL)
        }
    }
}
