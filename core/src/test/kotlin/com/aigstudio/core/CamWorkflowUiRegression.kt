package com.aigstudio.core

fun main() {
    check(CamWorkflowUiContract.singleEntryButton == "刀路")
    check(CamWorkflowUiContract.actions == listOf("外銑","內銑","型腔","方向","起/落刀","避讓壓板","Safe-Z"))
    check(CamWorkflowUiContract.maxTopLevelButtons == 1)
    check(CamWorkflowUiContract.manualFirst)
    println("STUDIO_CAM_WORKFLOW_UI_PASS|ONE_BUTTON|7_ACTIONS|MANUAL_FIRST")
}
