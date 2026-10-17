package com.aigstudio.core

private fun cmd(page:String, id:String, vararg args:Pair<String,String>):PageCommand =
    PageCommand(PageId.CAD, PageCatalog.requireSubpage(page), id, mapOf(*args))

fun main(){
    val cad=CadPageRuntime()
    check(cad.snapshot().revision==0L)

    check(cad.dispatch(cmd("CAD.DRAW","CAD.DRAW.LINE","x1" to "0","y1" to "0","x2" to "20","y2" to "0")) is PageResult.Accepted)
    check(cad.dispatch(cmd("CAD.DRAW","CAD.DRAW.RECT","x1" to "0","y1" to "0","x2" to "30","y2" to "20")) is PageResult.Accepted)
    check(cad.dispatch(cmd("CAD.DRAW","CAD.DRAW.CIRCLE","cx" to "10","cy" to "10","r" to "5")) is PageResult.Accepted)
    check(cad.dispatch(cmd("CAD.DRAW","CAD.DRAW.ARC","cx" to "0","cy" to "0","r" to "8","startDeg" to "0","endDeg" to "90","clockwise" to "false")) is PageResult.Accepted)
    check(cad.dispatch(cmd("CAD.DRAW","CAD.DRAW.HOLE","cx" to "12","cy" to "8","r" to "3")) is PageResult.Accepted)
    check(cad.geometrySnapshot().entities.size==8)
    check(cad.geometrySnapshot().entities.any{it.id.startsWith("HOLE:")})

    val beforeUndo=cad.snapshot().revision
    check(cad.dispatch(cmd("CAD.EDIT","CAD.EDIT.UNDO")) is PageResult.Accepted)
    check(cad.snapshot().revision==beforeUndo+1)
    check(cad.geometrySnapshot().entities.size==7)
    check(cad.dispatch(cmd("CAD.EDIT","CAD.EDIT.REDO")) is PageResult.Accepted)
    check(cad.geometrySnapshot().entities.size==8)

    val snap=cad.dispatch(cmd("CAD.VIEW","CAD.VIEW.SNAP","x" to "0.2","y" to "0.1","tolerance" to "1.0")) as PageResult.Accepted
    check(snap.evidence["snapped"]=="true")

    check(cad.dispatch(cmd("CAD.PHOTO","CAD.PHOTO.ALIGN","x" to "1.25","y" to "-2.5","rotationDeg" to "15")) is PageResult.Accepted)
    check(cad.dispatch(cmd("CAD.PHOTO","CAD.PHOTO.SCALE","mmPerPixel" to "0.025")) is PageResult.Accepted)
    check(cad.snapshot().state["photoScaleMmPerPixel"]=="0.025")

    val saved=cad.dispatch(cmd("CAD.FILE","CAD.FILE.SAVE")) as PageResult.Accepted
    val data=saved.evidence.getValue("cadData")
    val reopened=CadPageRuntime()
    check(reopened.dispatch(cmd("CAD.FILE","CAD.FILE.OPEN","data" to data)) is PageResult.Accepted)
    check(reopened.geometrySnapshot().entities.size==cad.geometrySnapshot().entities.size)

    val offsetCad=CadPageRuntime()
    offsetCad.dispatch(cmd("CAD.DRAW","CAD.DRAW.CIRCLE","cx" to "0","cy" to "0","r" to "5"))
    val circleId=offsetCad.geometrySnapshot().entities.single().id
    check(offsetCad.dispatch(cmd("CAD.EDIT","CAD.EDIT.OFFSET","ids" to circleId,"distance" to "1")) is PageResult.Accepted)
    check(offsetCad.geometrySnapshot().entities.size==2)
    check(offsetCad.dispatch(cmd("CAD.EDIT","CAD.EDIT.ARRAY","ids" to circleId,"count" to "3","dx" to "10","dy" to "0")) is PageResult.Accepted)
    check(offsetCad.geometrySnapshot().entities.size==4)

    val corner=CadPageRuntime()
    corner.dispatch(cmd("CAD.DRAW","CAD.DRAW.LINE","x1" to "0","y1" to "0","x2" to "20","y2" to "0"))
    corner.dispatch(cmd("CAD.DRAW","CAD.DRAW.LINE","x1" to "0","y1" to "0","x2" to "0","y2" to "20"))
    val cornerIds=corner.geometrySnapshot().entities.map{it.id}.joinToString(",")
    check(corner.dispatch(cmd("CAD.EDIT","CAD.EDIT.CHAMFER","ids" to cornerIds,"distance" to "2")) is PageResult.Accepted)
    check(corner.geometrySnapshot().entities.size==3)

    val fillet=CadPageRuntime()
    fillet.dispatch(cmd("CAD.DRAW","CAD.DRAW.LINE","x1" to "0","y1" to "0","x2" to "20","y2" to "0"))
    fillet.dispatch(cmd("CAD.DRAW","CAD.DRAW.LINE","x1" to "0","y1" to "0","x2" to "0","y2" to "20"))
    val filletIds=fillet.geometrySnapshot().entities.map{it.id}.joinToString(",")
    check(fillet.dispatch(cmd("CAD.EDIT","CAD.EDIT.FILLET","ids" to filletIds,"radius" to "2")) is PageResult.Accepted)
    check(fillet.geometrySnapshot().entities.any{it is Arc})

    val trim=CadPageRuntime()
    trim.dispatch(cmd("CAD.DRAW","CAD.DRAW.LINE","x1" to "0","y1" to "0","x2" to "20","y2" to "0"))
    trim.dispatch(cmd("CAD.DRAW","CAD.DRAW.LINE","x1" to "10","y1" to "-5","x2" to "10","y2" to "5"))
    val trimIds=trim.geometrySnapshot().entities.map{it.id}.joinToString(",")
    check(trim.dispatch(cmd("CAD.EDIT","CAD.EDIT.TRIM","ids" to trimIds)) is PageResult.Accepted)

    val extend=CadPageRuntime()
    extend.dispatch(cmd("CAD.DRAW","CAD.DRAW.LINE","x1" to "0","y1" to "0","x2" to "5","y2" to "0"))
    extend.dispatch(cmd("CAD.DRAW","CAD.DRAW.LINE","x1" to "10","y1" to "-5","x2" to "10","y2" to "5"))
    val extendIds=extend.geometrySnapshot().entities.map{it.id}.joinToString(",")
    check(extend.dispatch(cmd("CAD.EDIT","CAD.EDIT.EXTEND","ids" to extendIds)) is PageResult.Accepted)

    println("CAD_PAGE_RUNTIME_PASS|DRAW|TRIM_EXTEND_OFFSET_ARRAY|CHAMFER_FILLET|UNDO_REDO|SNAP|PHOTO|FILE_ROUNDTRIP|LOCAL_RUNTIME")
}
