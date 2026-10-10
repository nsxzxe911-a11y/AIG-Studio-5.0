package com.aigstudio.runtime4.renderer

data class MorningHomeLabel(val text:String,val bounds:UiBounds)

object MorningHomeTraditionalChinesePlan {
    private data class Spec(val text:String,val left:Float,val top:Float,val right:Float,val bottom:Float)
    private val landscapeTop=listOf(
        Spec("首頁",350f,64f,463f,97f),Spec("CAD製圖",469f,64f,582f,97f),Spec("CAM加工",588f,64f,700f,97f),
        Spec("3D走刀",705f,64f,819f,97f),Spec("多功能",824f,64f,939f,97f),Spec("NC程式",944f,64f,1058f,97f),Spec("AI智慧",1063f,64f,1181f,97f)
    )
    private val portraitTop=listOf(
        Spec("首頁",15f,197f,193f,233f),Spec("CAD製圖",202f,197f,372f,233f),Spec("CAM加工",381f,197f,551f,233f),
        Spec("3D走刀",560f,197f,730f,233f),Spec("多功能",740f,197f,915f,233f)
    )
    private val portraitMulti=listOf(
        Spec("3D走刀",22f,1608f,145f,1653f),Spec("3軸",150f,1608f,270f,1653f),Spec("4軸",276f,1608f,395f,1653f),
        Spec("5軸",401f,1608f,520f,1653f),Spec("6軸",526f,1608f,645f,1653f),Spec("NC程式",651f,1608f,773f,1653f),Spec("AI智慧",780f,1608f,917f,1653f)
    )
    fun labels(widthPx:Float,heightPx:Float):List<MorningHomeLabel>{
        val landscape=widthPx>heightPx
        val sourceW=if(landscape)1672f else 941f
        val sourceH=if(landscape)941f else 1672f
        val sx=widthPx/sourceW;val sy=heightPx/sourceH
        val specs=if(landscape)landscapeTop else portraitTop+portraitMulti
        return specs.map{MorningHomeLabel(it.text,UiBounds(it.left*sx,it.top*sy,it.right*sx,it.bottom*sy))}
    }
}
