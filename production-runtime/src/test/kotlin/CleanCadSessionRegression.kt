package com.aigstudio.production.runtime

fun main() {
    val cad=CleanCadSession()
    cad.addLine(0.0,0.0,20.0,10.0)
    cad.addRect(-10.0,-5.0,10.0,5.0)
    cad.addCircle(0.0,0.0,5.0)
    check(cad.entityCount()==6) { "expected 3 CAD shapes" }
    check(cad.undo())
    check(cad.entityCount()==5) { "undo must remove circle" }
    check(cad.redo())
    check(cad.entityCount()==6) { "redo must restore circle" }
    check(cad.primitives().isNotEmpty())
    println("CLEAN_CAD_RUNTIME_PASS|AIG_CNC|LINE_RECT_CIRCLE|UNDO_REDO|REAL_CORE")
}

