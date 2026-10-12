package com.aigstudio.app

data class Aig436VisualPage(val id: String, val resourceName: String)

object Aig436VisualPageContract {
    const val NAV_TOP_FRACTION = 0.090f
    const val NAV_BOTTOM_FRACTION = 0.158f
    const val VISUAL_AUTHORITY_OWNS_TOP_LAYER = true

    val pages = listOf(
        Aig436VisualPage("HOME", "aig436_page_home"),
        Aig436VisualPage("CAD", "aig436_page_cad"),
        Aig436VisualPage("CAM", "aig436_page_cam"),
        Aig436VisualPage("SIM", "aig436_page_sim"),
        Aig436VisualPage("3AX", "aig436_page_3ax"),
        Aig436VisualPage("4AX", "aig436_page_4ax"),
        Aig436VisualPage("5AX", "aig436_page_5ax"),
        Aig436VisualPage("6AX", "aig436_page_6ax"),
        Aig436VisualPage("NC", "aig436_page_nc"),
        Aig436VisualPage("AI", "aig436_page_ai")
    )

    private val boundaries = floatArrayOf(
        0.012f, 0.113f, 0.211f, 0.305f, 0.400f, 0.495f,
        0.590f, 0.685f, 0.780f, 0.875f, 0.988f
    )

    fun pageIndexForXFraction(x: Float): Int {
        val clamped = x.coerceIn(0f, 1f)
        for (i in 0 until pages.lastIndex) {
            if (clamped < boundaries[i + 1]) return i
        }
        return pages.lastIndex
    }
}
