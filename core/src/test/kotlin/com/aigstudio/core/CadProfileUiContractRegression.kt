package com.aigstudio.core

fun main() {
    check(CadProfileUiContract.actions == listOf("POLYLINE","SLOT","CHECK","JOIN","BREAK"))
    check(CadProfileUiContract.singleMultiFunctionButton)
    check(CadProfileUiContract.minimumMm == 0.001)
    println("STUDIO_CAD_PROFILE_UI_CONTRACT_PASS|ONE_BUTTON|5_ACTIONS")
}
