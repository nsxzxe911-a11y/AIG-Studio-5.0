package com.aigstudio.core

fun main(){
    check(CadAdvancedUiContract.singleMultiFunctionButton)
    check(CadAdvancedUiContract.actions==listOf("MEASURE","CONSTRAINT","DXF","CAM_FEATURE"))
    println("STUDIO_CAD_ADV_UI_PASS")
}
