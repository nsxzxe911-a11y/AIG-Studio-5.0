package com.aigstudio.core

fun main() {
    check(CamWorkflowUiContract.singleEntryButton == "刀路")
    check(CamWorkflowUiContract.actions == listOf("外銑","內銑","型腔","方向","起/落刀","避讓壓板","Safe-Z"))
    check(CamWorkflowUiContract.maxTopLevelButtons == 1)
    check(CamWorkflowUiContract.manualFirst)
    check(CamWorkflowUiContract.isStudioCamCategory("CAM"))
    check(CamWorkflowUiContract.isStudioCamCategory("加工"))
    check(!CamWorkflowUiContract.isStudioCamCategory("繪圖"))
    println("STUDIO_CAM_WORKFLOW_UI_PASS|ONE_BUTTON|7_ACTIONS|MANUAL_FIRST|CAM_CATEGORY")
}
