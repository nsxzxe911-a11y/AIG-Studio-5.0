package com.aigstudio.core

fun main() {
    check(RuntimeSurfaceVisualContract.surfaces == listOf(
        "HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"
    ))
    check(RuntimeSurfaceVisualContract.assetId("HOME")=="rgb_wallpaper")
    check(RuntimeSurfaceVisualContract.assetId("CAD")=="cad")
    check(RuntimeSurfaceVisualContract.assetId("CAM")=="cam")
    check(RuntimeSurfaceVisualContract.assetId("SIM")=="sim")
    check(RuntimeSurfaceVisualContract.assetId("3AX")=="3ax")
    check(RuntimeSurfaceVisualContract.assetId("4AX")=="4ax")
    check(RuntimeSurfaceVisualContract.assetId("5AX")=="5ax")
    check(RuntimeSurfaceVisualContract.assetId("6AX")=="6ax")
    check(RuntimeSurfaceVisualContract.assetId("5AX") != RuntimeSurfaceVisualContract.assetId("6AX"))
    check(RuntimeSurfaceVisualContract.sixAxisIsIndependent())
    check(RuntimeSurfaceVisualContract.HOME_ALPHA > 0)
    check(RuntimeSurfaceVisualContract.SURFACE_ALPHA > 0)
    println("RUNTIME_SURFACE_VISUAL_CONTRACT_PASS|10_SURFACES|RGB_VISIBLE|6AX_INDEPENDENT")
}
