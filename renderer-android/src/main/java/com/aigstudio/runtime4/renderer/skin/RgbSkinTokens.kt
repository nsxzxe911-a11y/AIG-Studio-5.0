package com.aigstudio.runtime4.renderer

object RgbSkinTokens {
    const val BACKGROUND="#01050A";const val PANEL="#06121F";const val TEXT="#EEF9FF";const val ACCENT="#1ED8FF";const val WARNING="#FFB12A";const val ALARM="#FF3D5E"
    fun panelFill():FloatArray=floatArrayOf(0.018f,0.055f,0.090f,0.92f)
    fun fillFor(state:VisualState):FloatArray=when(state){
        VisualState.NORMAL->floatArrayOf(0.035f,0.135f,0.205f,0.86f)
        VisualState.PRESSED->floatArrayOf(0.12f,0.34f,0.48f,0.98f)
        VisualState.SELECTED->floatArrayOf(0.08f,0.46f,0.58f,0.98f)
        VisualState.DISABLED->floatArrayOf(0.028f,0.045f,0.065f,0.58f)
        VisualState.ALARM->floatArrayOf(0.38f,0.035f,0.070f,0.96f)
    }
    fun edgeFor(edge:Int,state:VisualState):FloatArray {
        if(state==VisualState.ALARM)return if(edge%2==0)floatArrayOf(1f,0.16f,0.28f,0.98f) else floatArrayOf(1f,0.48f,0.10f,0.98f)
        val alpha=if(state==VisualState.DISABLED)0.28f else if(state==VisualState.SELECTED||state==VisualState.PRESSED)1f else 0.82f
        return when(edge.mod(4)){0->floatArrayOf(0.10f,0.92f,1f,alpha);1->floatArrayOf(0.22f,0.42f,1f,alpha);2->floatArrayOf(1f,0.18f,0.78f,alpha);else->floatArrayOf(0.70f,0.18f,1f,alpha)}
    }
}