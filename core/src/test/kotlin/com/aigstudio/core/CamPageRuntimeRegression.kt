package com.aigstudio.core

private fun camCmd(page:String,id:String,vararg args:Pair<String,String>):PageCommand =
    PageCommand(PageId.CAM, PageCatalog.requireSubpage(page), id, mapOf(*args))

fun main(){
    val cad=DrawingSnapshot(listOf(Circle(id="HOLE:DRILL1",center=Vec2(10.0,20.0),radius=5.0)))
    val cam=CamPageRuntime(cadSnapshot=cad,cadRevision=7L)
    check(cam.snapshot().state["mode"]=="MANUAL")

    check(cam.dispatch(camCmd("CAM.MANUAL","CAM.MANUAL.ADD_POINT",
        "x" to "10","y" to "20","z" to "-2","rapid" to "false",
        "a" to "15","b" to "25","c" to "35")) is PageResult.Accepted)
    check(cam.dispatch(camCmd("CAM.MANUAL","CAM.MANUAL.ADD_POINT",
        "x" to "20","y" to "20","z" to "-2","rapid" to "false")) is PageResult.Accepted)

    val preview=cam.dispatch(camCmd("CAM.POST_PREVIEW","CAM.POST_PREVIEW.GENERATE")) as PageResult.Accepted
    check(preview.evidence.getValue("toolpathCount").toInt()>0)
    check(preview.evidence.getValue("moveCount").toInt()>0)
    val firstCut=cam.toolpaths().flatMap{it.moves}.first{!it.rapid}
    check(firstCut.axisA==15.0 && firstCut.axisB==25.0 && firstCut.axisC==35.0)

    check(cam.dispatch(camCmd("CAM.MANUAL","CAM.MANUAL.SET_SAFE_Z","z" to "8")) is PageResult.Accepted)
    check(cam.snapshot().state["safeZ"]=="8.0")
    check(cam.dispatch(camCmd("CAM.MANUAL","CAM.MANUAL.SET_MOTION_G0","index" to "1")) is PageResult.Accepted)
    check(cam.manualPoints()[1].rapid && cam.manualPoints()[1].z>=8.0)
    check(cam.dispatch(camCmd("CAM.MANUAL","CAM.MANUAL.SET_MOTION_G1","index" to "1","z" to "-1.5")) is PageResult.Accepted)
    check(!cam.manualPoints()[1].rapid && cam.manualPoints()[1].z==-1.5)

    check(cam.dispatch(camCmd("CAM.MAIN","CAM.MAIN.COMP_G41")) is PageResult.Accepted)
    check(cam.snapshot().state["compensation"]=="G41")
    check(cam.dispatch(camCmd("CAM.MAIN","CAM.MAIN.COMP_G42")) is PageResult.Accepted)
    check(cam.snapshot().state["compensation"]=="G42")
    check(cam.dispatch(camCmd("CAM.TOOL","CAM.TOOL.SELECT","diameter" to "6","feed" to "240")) is PageResult.Accepted)
    check(cam.snapshot().state["toolDiameter"]=="6.0")
    check(cam.dispatch(camCmd("CAM.REGION","CAM.REGION.SELECT","regionId" to "POCKET_A")) is PageResult.Accepted)
    check(cam.snapshot().state["regionId"]=="POCKET_A")

    val autoContour=cam.dispatch(camCmd("CAM.AUTO","CAM.AUTO.CONTOUR")) as PageResult.Accepted
    check(autoContour.evidence.getValue("toolpathCount").toInt()>0)
    check(autoContour.evidence.getValue("moveCount").toInt()>0)
    check(cam.snapshot().state["mode"]=="AUTO")

    val drill=cam.dispatch(camCmd("CAM.AUTO","CAM.AUTO.DRILL")) as PageResult.Accepted
    check(drill.evidence["strategy"]=="DRILL")
    check(drill.evidence.getValue("toolpathCount")=="1")
    val drillMoves=cam.toolpaths().single().moves
    check(drillMoves.size==3)
    check(drillMoves[0] is Rapid && drillMoves[1] is Feed && drillMoves[2] is Rapid)
    check(drillMoves[0].to==Vec2(10.0,20.0) && drillMoves[1].to==Vec2(10.0,20.0))

    val manualAgain=cam.dispatch(camCmd("CAM.MANUAL","CAM.MANUAL.ADD_POINT",
        "x" to "30","y" to "20","z" to "-2","rapid" to "false","a" to "45","b" to "55","c" to "65"))
    check(manualAgain is PageResult.Accepted)
    check(cam.snapshot().state["mode"]=="MANUAL")
    check(cam.manualPoints().last().let{it.axisA==45.0 && it.axisB==55.0 && it.axisC==65.0})

    println("CAM_PAGE_RUNTIME_PASS|MANUAL_FIRST|G0_G1|SAFE_Z|ABC_PRESERVED|COMP|TOOL_REGION|AUTO_REAL_TOOLPATH|DRILL_REAL_TOOLPATH|LOCAL_RUNTIME")
}
