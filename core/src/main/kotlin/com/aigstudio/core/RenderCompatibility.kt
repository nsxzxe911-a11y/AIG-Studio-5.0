package com.aigstudio.core

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

enum class RenderResolutionTier(
    val label:String,
    val minShortPx:Int,
    val minLongPx:Int,
    val uiScale:Double,
    val meshScale:Double,
    val glowScale:Double
){
    FHD_1080("1080P/FHD+",0,0,1.00,1.00,1.00),
    QHD_2K("2K-class",1440,2400,1.07,1.12,0.96),
    THREE_K("3K-class",1440,2880,1.12,1.24,0.92),
    UHD_4K("UHD/4K+",2160,3800,1.18,1.38,0.88)
}

data class RenderCompatibilityProfile(
    val tier:RenderResolutionTier,
    val widthPx:Int,
    val heightPx:Int,
    val displayHz:Double,
    val targetFps:Int,
    val uiScale:Double,
    val meshScale:Double,
    val glowScale:Double,
    val frameBudgetMs:Double
)

object RenderCompatibilityContract {
    const val STARTUP_SAFE_HZ=60
    const val STARTUP_PROMOTION_DELAY_MS=1800L
    const val MAX_REFRESH_HZ=120
    const val MIN_REFRESH_HZ=30
    val SUPPORTED_REFRESH_HZ=listOf(30,60,90,120)
    val SUPPORTED_RESOLUTION_LABELS=listOf("1080P/FHD+","2K-class","3K-class","UHD/4K+")

    fun tier(widthPx:Int,heightPx:Int):RenderResolutionTier {
        val longEdge=max(widthPx,heightPx).coerceAtLeast(1)
        val shortEdge=min(widthPx,heightPx).coerceAtLeast(1)
        return when {
            shortEdge>=RenderResolutionTier.UHD_4K.minShortPx &&
                longEdge>=RenderResolutionTier.UHD_4K.minLongPx -> RenderResolutionTier.UHD_4K
            shortEdge>=RenderResolutionTier.THREE_K.minShortPx &&
                longEdge>=RenderResolutionTier.THREE_K.minLongPx -> RenderResolutionTier.THREE_K
            shortEdge>=RenderResolutionTier.QHD_2K.minShortPx &&
                longEdge>=RenderResolutionTier.QHD_2K.minLongPx -> RenderResolutionTier.QHD_2K
            else -> RenderResolutionTier.FHD_1080
        }
    }

    fun refreshBucket(displayHz:Double):Int {
        val hz=if(displayHz.isFinite()) displayHz.coerceIn(MIN_REFRESH_HZ.toDouble(),MAX_REFRESH_HZ.toDouble()) else 60.0
        return when {
            hz>=105.0 -> 120
            hz>=75.0 -> 90
            hz>=45.0 -> 60
            else -> 30
        }
    }

    fun profile(widthPx:Int,heightPx:Int,displayHz:Double):RenderCompatibilityProfile {
        val tier=tier(widthPx,heightPx)
        val fps=refreshBucket(displayHz)
        val refreshLoad=when(fps){
            120->0.78
            90->0.86
            60->0.94
            else->1.00
        }
        return RenderCompatibilityProfile(
            tier=tier,
            widthPx=widthPx.coerceAtLeast(1),
            heightPx=heightPx.coerceAtLeast(1),
            displayHz=displayHz,
            targetFps=fps,
            uiScale=tier.uiScale,
            meshScale=(tier.meshScale*refreshLoad).coerceIn(0.72,1.38),
            glowScale=(tier.glowScale*(if(fps>=90)0.94 else 1.0)).coerceIn(0.80,1.0),
            frameBudgetMs=1000.0/fps
        )
    }
}

object RenderColorCompatibility {
    const val MAX_CHANNEL_DELTA=24
    const val MAX_RELATIVE_LUMA_DELTA=0.12
    const val MAX_ANIMATION_LUMA_SWING=0.12

    const val BACKGROUND_RGB=0x020407
    const val PANEL_RGB=0x07111B
    const val TEXT_RGB=0xF4FBFF
    const val ACCENT_RGB=0x27E9FF
    const val CUTTING_RGB=0x33F39B
    const val RAPID_RGB=0xFF4DA6
    const val WARNING_RGB=0xFFB326
    const val ALARM_RGB=0xFF465F

    val semanticPalette=listOf(
        ACCENT_RGB,CUTTING_RGB,RAPID_RGB,WARNING_RGB,ALARM_RGB
    )

    private fun channel(rgb:Int,shift:Int)=(rgb ushr shift) and 0xFF
    private fun alpha(argb:Int)=((argb ushr 24) and 0xFF).let { if(it==0)255 else it }
    private fun pack(a:Int,r:Int,g:Int,b:Int)=
        ((a.coerceIn(0,255) shl 24) or (r.coerceIn(0,255) shl 16) or
            (g.coerceIn(0,255) shl 8) or b.coerceIn(0,255))

    fun maxChannelDelta(a:Int,b:Int):Int=maxOf(
        abs(channel(a,16)-channel(b,16)),
        abs(channel(a,8)-channel(b,8)),
        abs(channel(a,0)-channel(b,0))
    )

    fun relativeLuma(rgb:Int):Double =
        (0.2126*channel(rgb,16)+0.7152*channel(rgb,8)+0.0722*channel(rgb,0))/255.0

    fun withinTolerance(candidate:Int,reference:Int):Boolean =
        maxChannelDelta(candidate,reference)<=MAX_CHANNEL_DELTA &&
            abs(relativeLuma(candidate)-relativeLuma(reference))<=MAX_RELATIVE_LUMA_DELTA

    fun harmonizeRgb(candidate:Int,reference:Int,maxDelta:Int=MAX_CHANNEL_DELTA):Int {
        fun clampChannel(value:Int,ref:Int)=value.coerceIn((ref-maxDelta).coerceAtLeast(0),(ref+maxDelta).coerceAtMost(255))
        return pack(
            alpha(candidate),
            clampChannel(channel(candidate,16),channel(reference,16)),
            clampChannel(channel(candidate,8),channel(reference,8)),
            clampChannel(channel(candidate,0),channel(reference,0))
        )
    }

    fun nearestSemanticReference(candidate:Int):Int =
        semanticPalette.minByOrNull { ref ->
            val dr=channel(candidate,16)-channel(ref,16)
            val dg=channel(candidate,8)-channel(ref,8)
            val db=channel(candidate,0)-channel(ref,0)
            dr*dr+dg*dg+db*db
        } ?: ACCENT_RGB

    fun harmonizeNearestSemantic(candidate:Int):Int =
        harmonizeRgb(candidate,nearestSemanticReference(candidate))

    fun pulseMultiplier(phase01:Double):Double {
        val phase=(phase01%1.0+1.0)%1.0
        val halfSwing=MAX_ANIMATION_LUMA_SWING/2.0
        return 1.0+halfSwing*sin(phase*2.0*Math.PI)
    }

    fun animationPeriodMs(targetFps:Int):Long = when {
        targetFps>=120 -> 960L
        targetFps>=90 -> 1000L
        targetFps>=60 -> 1080L
        else -> 1160L
    }
}


object RgbButtonVisualContract {
    const val CALLBACK_STABLE=true
    const val HOT_REPLACE_ALLOWED=true
    const val RESTART_REQUIRED=false
    const val FALLBACK_TO_VERIFIED_DEFAULT=true
    const val DEPTH_LAYERS=4
    const val PRESS_SCALE=0.965
    val verifiedAssetId=Regex("[a-z0-9_\\-]{2,64}")

    fun requireAssetId(id:String):String {
        val normalized=id.trim().lowercase()
        require(verifiedAssetId.matches(normalized)){"Invalid RGB button asset id"}
        return normalized
    }

    fun depthScale(tier:RenderResolutionTier):Double=when(tier){
        RenderResolutionTier.UHD_4K->1.12
        RenderResolutionTier.THREE_K->1.08
        RenderResolutionTier.QHD_2K->1.04
        RenderResolutionTier.FHD_1080->1.00
    }
}
