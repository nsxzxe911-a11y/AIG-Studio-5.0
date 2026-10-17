package com.aigstudio.core

fun main(){
    val defs = PageCommandCatalog.definitions
    check(defs.isNotEmpty())
    check(defs.map { it.commandId }.distinct().size == defs.size)
    check(defs.all { it.allowedSubpages.isNotEmpty() })
    check(defs.all { def -> def.allowedSubpages.all { it.page == def.page } })
    check(defs.all { it.requiresCoreResult })

    val required = setOf(
        "HOME.PROJECTS.OPEN","HOME.SETTINGS.OPEN","HOME.SYNC.STATUS",
        "CAD.DRAW.LINE","CAD.DRAW.RECT","CAD.DRAW.CIRCLE","CAD.DRAW.ARC","CAD.DRAW.HOLE",
        "CAD.EDIT.TRIM","CAD.EDIT.EXTEND","CAD.EDIT.OFFSET","CAD.EDIT.ARRAY","CAD.EDIT.CHAMFER","CAD.EDIT.FILLET","CAD.EDIT.UNDO","CAD.EDIT.REDO",
        "CAD.FILE.OPEN","CAD.FILE.SAVE","CAD.FILE.IMPORT","CAD.FILE.EXPORT","CAD.PHOTO.ALIGN","CAD.PHOTO.SCALE","CAD.VIEW.SNAP",
        "CAM.AUTO.GENERATE","CAM.AUTO.ROUGH","CAM.AUTO.FINISH","CAM.AUTO.CONTOUR","CAM.AUTO.DRILL",
        "CAM.MANUAL.ADD_POINT","CAM.MANUAL.EDIT_POINT","CAM.MANUAL.DELETE_POINT","CAM.MANUAL.SET_MOTION_G0","CAM.MANUAL.SET_MOTION_G1","CAM.MANUAL.SET_SAFE_Z",
        "CAM.MAIN.COMP_G41","CAM.MAIN.COMP_G42","CAM.TOOL.SELECT","CAM.REGION.SELECT","CAM.POST_PREVIEW.GENERATE",
        "SIM.PLAYBACK.PLAY","SIM.PLAYBACK.PAUSE","SIM.PLAYBACK.SINGLE_BLOCK","SIM.PLAYBACK.STOP","SIM.PLAYBACK.RESET","SIM.MATERIAL.RUN","SIM.COLLISION.CHECK","SIM.MAIN.VIEW_3D","SIM.RESULT.ACCEPT",
        "NC.EDITOR.INSERT","NC.EDITOR.DELETE","NC.EDITOR.BLOCK_SKIP","NC.EDITOR.CUSTOM_M_CODE","NC.PARSER.PARSE","NC.PREVIEW.RENDER","NC.VERIFY.RUN","NC.VERIFY.SINGLE_BLOCK","NC.VERIFY.DRY_RUN","NC.OUTPUT.PREPARE","NC.OUTPUT.SEND_MACHINE",
        "AI.ASSIST.EXPLAIN","AI.PLAN.BUILD","AI.PLAN.OPTIMIZE","AI.AUDIT.RUN","AI.RECOVERY.REPLAN"
    )
    check(required.all { id -> defs.any { it.commandId == id } })

    fun has(page: PageId, id: String) = defs.any { it.page == page && it.commandId == id }
    check(!has(PageId.AX3, "3AX.MACHINE.JOG_A_POS"))
    check(has(PageId.AX4, "4AX.MACHINE.JOG_A_POS"))
    check(!has(PageId.AX4, "4AX.MACHINE.JOG_B_POS"))
    check(has(PageId.AX5, "5AX.MACHINE.JOG_A_POS"))
    check(has(PageId.AX5, "5AX.MACHINE.JOG_B_POS"))
    check(!has(PageId.AX5, "5AX.MACHINE.JOG_C_POS"))
    check(has(PageId.AX6, "6AX.MACHINE.JOG_A_POS"))
    check(has(PageId.AX6, "6AX.MACHINE.JOG_B_POS"))
    check(has(PageId.AX6, "6AX.MACHINE.JOG_C_POS"))
    check(has(PageId.AX3, "3AX.NC_FIRST.OPEN"))
    check(has(PageId.AX4, "4AX.NC_FIRST.OPEN"))
    check(has(PageId.AX5, "5AX.NC_FIRST.OPEN"))
    check(has(PageId.AX6, "6AX.NC_FIRST.OPEN"))

    val wrong = PageCommand(PageId.CAM, PageCatalog.requireSubpage("CAM.MAIN"), "CAD.DRAW.LINE")
    check(runCatching { PageCommandCatalog.validate(wrong) }.isFailure)
    val valid = PageCommand(PageId.CAD, PageCatalog.requireSubpage("CAD.DRAW"), "CAD.DRAW.LINE")
    check(PageCommandCatalog.validate(valid).commandId == "CAD.DRAW.LINE")

    check(PageCommandCatalog.requireDefinition("NC.OUTPUT.SEND_MACHINE").dangerClass == ButtonDangerClass.CNC_OUTPUT)
    println("PAGE_COMMAND_CATALOG_PASS|UNIQUE|PAGE_OWNERSHIP|3AX_4AX_5AX_6AX|PROFESSIONAL_COMMAND_FAMILIES|NO_WRONG_PAGE")
}
