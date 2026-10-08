package com.aigstudio.core

data class SkinPack(
    val id:String,
    val displayName:String,
    val preferredLayouts:Set<String>,
    val surfaceAssets:Map<String,String>
)

object SkinPackRegistry {
    val layoutProfiles=setOf("MOBILE_PORTRAIT","MOBILE_LANDSCAPE","DESKTOP_WIDE","DESKTOP_4K")

    private val classic=SkinPack(
        id="AIG_RGB_CLASSIC",
        displayName="AIG RGB Classic",
        preferredLayouts=setOf("MOBILE_PORTRAIT","MOBILE_LANDSCAPE"),
        surfaceAssets=mapOf(
            "HOME" to "AIG_Home_Multifunction_Baseline.png",
            "CAD" to "AIG_CAD_CAM_Desktop_Baseline.png",
            "CAM" to "AIG_CAD_CAM_Desktop_Baseline.png",
            "SIM" to "AIG_CNC_Desktop_Baseline.png",
            "3AX" to "AIG_CNC_Desktop_Baseline.png",
            "4AX" to "AIG_4AX_Baseline.png",
            "5AX" to "AIG_CNC_Desktop_Baseline.png",
            "6AX" to "AIG_6AX_Baseline.png",
            "NC" to "AIG_CNC_Desktop_Baseline.png",
            "AI" to "AI_Console_Baseline.png"
        )
    )

    private val neonPro=SkinPack(
        id="AIG_NEON_PRO",
        displayName="AIG Neon Pro",
        preferredLayouts=setOf("MOBILE_PORTRAIT","MOBILE_LANDSCAPE","DESKTOP_WIDE"),
        surfaceAssets=mapOf(
            "HOME" to "neon/home.png",
            "CAD" to "neon/cad.png",
            "CAM" to "neon/cam.png",
            "SIM" to "neon/sim.png",
            "3AX" to "neon/3ax.png",
            "4AX" to "neon/4ax.png",
            "5AX" to "neon/5ax.png",
            "6AX" to "neon/6ax.png",
            "NC" to "neon/nc.png",
            "AI" to "neon/ai.png"
        )
    )

    private val industrialUltra=SkinPack(
        id="AIG_INDUSTRIAL_ULTRA",
        displayName="AIG Industrial Ultra",
        preferredLayouts=setOf("DESKTOP_WIDE","DESKTOP_4K","MOBILE_LANDSCAPE"),
        surfaceAssets=mapOf(
            "HOME" to "industrial/home.png",
            "CAD" to "industrial/cad.png",
            "CAM" to "industrial/cam.png",
            "SIM" to "industrial/sim.png",
            "3AX" to "industrial/3ax.png",
            "4AX" to "industrial/4ax.png",
            "5AX" to "industrial/5ax.png",
            "6AX" to "industrial/6ax.png",
            "NC" to "industrial/nc.png",
            "AI" to "industrial/ai.png"
        )
    )

    val packs=listOf(classic,neonPro,industrialUltra)

    fun require(id:String):SkinPack=packs.first{it.id==id.trim().uppercase()}
}
