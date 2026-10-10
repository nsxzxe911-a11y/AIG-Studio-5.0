package com.aigstudio.runtime4.renderer

data class MorningHomeLabel(val text:String,val bounds:UiBounds)

object MorningHomeTraditionalChinesePlan {
    private data class Spec(val text:String,val left:Float,val top:Float,val right:Float,val bottom:Float)
    private val landscapeTop=listOf(
        Spec("首頁",350f,55f,463f,98f),Spec("CAD製圖",469f,55f,582f,98f),Spec("CAM加工",588f,55f,700f,98f),
        Spec("3D走刀",705f,55f,819f,98f),Spec("多功能",824f,55f,939f,98f),Spec("NC程式",944f,55f,1058f,98f),Spec("AI智慧",1063f,55f,1181f,98f)
    )
    private val portraitTop=listOf(
        Spec("首頁",15f,181f,193f,234f),Spec("CAD製圖",202f,181f,372f,234f),Spec("CAM加工",381f,181f,551f,234f),
        Spec("3D走刀",560f,181f,730f,234f),Spec("多功能",740f,181f,915f,234f)
    )
    private val portraitMulti=listOf(
        Spec("3D走刀",22f,1586f,145f,1653f),Spec("3軸",150f,1586f,270f,1653f),Spec("4軸",276f,1586f,395f,1653f),
        Spec("5軸",401f,1586f,520f,1653f),Spec("6軸",526f,1586f,645f,1653f),Spec("NC程式",651f,1586f,773f,1653f),Spec("AI智慧",780f,1586f,917f,1653f)
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
