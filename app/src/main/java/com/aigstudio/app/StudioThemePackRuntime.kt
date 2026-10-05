package com.aigstudio.app

import android.graphics.Color
import java.util.concurrent.CopyOnWriteArraySet

data class StudioThemePalette(
    val id:String,
    val name:String,
    val background:Int,
    val panel:Int,
    val text:Int,
    val accent:Int,
    val selected:Int,
    val cutting:Int,
    val rapid:Int,
    val warning:Int,
    val alarm:Int
)

object StudioThemePackRuntime {
    const val PROFILE="AIG_STUDIO_THEME_PACK_HOT_SWAP_V1"
    const val RESTART_REQUIRED=false
    const val ENGINEERING_SHELL_FALLBACK=false
    const val BUTTON_VISUAL_HOT_REPLACE=true
    const val BUTTON_CALLBACK_STABLE=true
    const val GLASS_DEPTH_LAYERS=4
    const val RGB_MAX_CHANNEL_DELTA=24
    const val RGB_MAX_RELATIVE_LUMA_DELTA=0.12
    const val SAFE_DEFAULT_REFRESH_HZ=60

    private val packs=linkedMapOf(
        "official_rgb_original" to StudioThemePalette(
            id="official_rgb_original",name="Official RGB Original",
            background=Color.rgb(8,16,26),panel=Color.rgb(16,32,51),text=Color.rgb(244,251,255),
            accent=Color.rgb(61,235,255),selected=Color.rgb(0,229,255),
            cutting=Color.rgb(0,230,118),rapid=Color.rgb(213,0,249),
            warning=Color.rgb(255,152,0),alarm=Color.rgb(255,23,68)
        ),
        "aig_rgb_global_v1" to StudioThemePalette(
            id="aig_rgb_global_v1",name="AIG RGB Global V1",
            background=Color.rgb(2,4,7),panel=Color.rgb(7,17,27),text=Color.rgb(244,251,255),
            accent=Color.rgb(39,233,255),selected=Color.rgb(39,233,255),
            cutting=Color.rgb(51,243,155),rapid=Color.rgb(255,77,166),
            warning=Color.rgb(255,179,38),alarm=Color.rgb(255,70,95)
        ),
        "aigii_rgb_neon_v2" to StudioThemePalette(
            id="aigii_rgb_neon_v2",name="AIG II RGB Neon V2",
            background=Color.rgb(2,4,7),panel=Color.rgb(7,17,27),text=Color.rgb(244,251,255),
            accent=Color.rgb(39,233,255),selected=Color.rgb(39,233,255),
            cutting=Color.rgb(51,243,155),rapid=Color.rgb(255,77,166),
            warning=Color.rgb(255,179,38),alarm=Color.rgb(255,70,95)
        ),
        "aig_mobile_rgb_v1" to StudioThemePalette(
            id="aig_mobile_rgb_v1",name="AIG Mobile RGB V1",
            background=Color.rgb(1,5,10),panel=Color.rgb(6,18,31),text=Color.rgb(238,249,255),
            accent=Color.rgb(30,216,255),selected=Color.rgb(20,221,255),
            cutting=Color.rgb(45,245,165),rapid=Color.rgb(180,78,255),
            warning=Color.rgb(255,177,42),alarm=Color.rgb(255,61,94)
        )
    )

    @Volatile private var currentId="aig_rgb_global_v1"
    private val listeners=CopyOnWriteArraySet<(StudioThemePalette)->Unit>()

    val current:StudioThemePalette get()=packs.getValue(currentId)
    fun ids():List<String> = packs.keys.toList()
    fun name(id:String):String = packs[id]?.name ?: id
    fun addListener(listener:(StudioThemePalette)->Unit){listeners.add(listener)}
    fun removeListener(listener:(StudioThemePalette)->Unit){listeners.remove(listener)}

    @Synchronized
    fun switchTo(id:String):StudioThemePalette {
        val next=packs[id] ?: error("Unknown theme pack: $id")
        val previous=currentId
        return runCatching {
            currentId=id
            listeners.forEach { it(next) }
            next
        }.getOrElse { error ->
            currentId=previous
            val restored=current
            runCatching { listeners.forEach { it(restored) } }
            throw error
        }
    }

    @Synchronized
    fun cycle():StudioThemePalette {
        val ids=ids()
        val index=ids.indexOf(currentId).coerceAtLeast(0)
        return switchTo(ids[(index+1)%ids.size])
    }
}
