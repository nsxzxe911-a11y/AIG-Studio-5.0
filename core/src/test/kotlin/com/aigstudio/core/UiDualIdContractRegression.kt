package com.aigstudio.core

fun main(){
    val button="CAD.DRAW.LINE"
    val view=UiDualIdContract.viewIdForButton(button)
    check(view=="VIEW.CAD.DRAW.LINE")
    check(UiDualIdContract.buttonIdForView(view)==button)

    val navButton="NAV_CAD"
    val navView=UiDualIdContract.navigationViewId(navButton)
    check(navView=="VIEW.NAV.CAD")
    check(UiDualIdContract.navigationButtonId(navView)==navButton)

    check(runCatching{UiDualIdContract.buttonIdForView("VIEW.CAD.DRAW.NOT_REAL")}.isFailure)
    check(runCatching{UiDualIdContract.buttonIdForView("VIEW.NAV.CAD")}.isFailure)
    check(runCatching{UiDualIdContract.navigationButtonId("VIEW.NAV.NOT_REAL")}.isFailure)

    check(UiButtonManifestContract.PRODUCTION_NAVIGATION.size==10)
    check(UiButtonManifestContract.PRODUCTION_NAVIGATION.all{
        it.viewId==UiDualIdContract.navigationViewId(it.buttonId) &&
        it.verifiedCallback.startsWith("PageRuntimeRouter.navigate(") &&
        !it.verifiedCallback.contains("Toast",ignoreCase=true)
    })

    println("UI_DUAL_ID_CONTRACT_PASS|VIEW_ID|BUTTON_COMMAND_ID|NAV_VIEW_ID|FAIL_CLOSED|NO_TOAST")
}
