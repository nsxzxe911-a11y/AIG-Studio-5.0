package com.aigstudio.core

/**
 * Product-facing Runtime surface contract.  Asset existence does not mean a
 * surface is verified: it must be mounted by the platform Runtime and then
 * observed from a real packaged launch.
 */
object RuntimeSurfaceVisualContract {
    val surfaces = listOf("HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI")

    private val assetIds = mapOf(
        "HOME" to "rgb_wallpaper",
        "CAD" to "cad",
        "CAM" to "cam",
        "SIM" to "sim",
        "3AX" to "3ax",
        "4AX" to "4ax",
        "5AX" to "5ax",
        "6AX" to "6ax",
        "NC" to "nc",
        "AI" to "ai"
    )

    fun normalize(raw:String):String {
        val n=raw.trim().uppercase().replace(Regex("\\s+")," ")
        return when {
            n=="首頁" || n=="HOME" -> "HOME"
            n.contains("2D CAD") || n=="CAD" -> "CAD"
            n=="CAM" || n.startsWith("CAM ") -> "CAM"
            n=="SIM" || n.contains("3D SIM") -> "SIM"
            n.contains("3AX") || n.contains("3 AXIS") -> "3AX"
            n.contains("4AX") || n.contains("4 AXIS") -> "4AX"
            n.contains("5AX") || n.contains("5 AXIS") || n=="5X" -> "5AX"
            n.contains("6AX") || n.contains("6 AXIS") || n=="6X" -> "6AX"
            n=="NC" || n.contains("NC EDIT") || n.contains("NC_EDIT") -> "NC"
            n=="AI" || n.contains("AI ") -> "AI"
            else -> "HOME"
        }
    }

    fun assetId(surface:String):String = assetIds.getValue(normalize(surface))
    fun isFormal(surface:String):Boolean = normalize(surface) in surfaces

    // Product visuals must remain clearly visible; this is not a hidden icon.
    const val HOME_ALPHA=220
    const val SURFACE_ALPHA=168

    // Product rule: 6AX owns a distinct visual asset and must never alias 5AX.
    fun sixAxisIsIndependent():Boolean = assetIds["6AX"]=="6ax" && assetIds["6AX"]!=assetIds["5AX"]
}
