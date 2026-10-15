package com.aigstudio.core

fun main() {
    val emptyCad=DrawingSnapshot(emptyList())
    val draft=ManualCamPathEngine.startBlank(
        CamSettings(
            toolDiameter=6.0,
            depth=-2.0,
            safeZ=8.0,
            feedMmMin=160.0
        ),
        0.0,
        0.0
    )

    check(draft.pathMode==CamPathMode.MANUAL)
    check(draft.manualPath.all{it.rapid})

    val rejected=runCatching {
        CamModel.fromCad(3710001L,emptyCad,draft)
    }.exceptionOrNull()
    check(rejected is IllegalArgumentException) {
        "MANUAL draft containing only G0 moves must not become a machining toolpath"
    }
    check(rejected.message?.contains("cutting move",ignoreCase=true)==true) {
        "MANUAL G0-only rejection must explain that a cutting move is required"
    }

    val ready=ManualCamPathEngine.replacePoint(
        draft,
        index=1,
        x=12.0,
        y=3.0,
        z=-2.0,
        rapid=false,
        axisA=15.0,
        axisB=-10.0,
        axisC=45.0
    )
    val cam=CamModel.fromCad(3710002L,emptyCad,ready)
    val moves=cam.toolpaths.flatMap{it.moves}
    check(moves.size==2)
    check(moves.first().rapid)
    check(moves.any{!it.rapid})
    val cut=moves.last()
    check(!cut.rapid)
    check(cut.axisA==15.0 && cut.axisB==-10.0 && cut.axisC==45.0)

    println("STUDIO_CAM_MANUAL_MACHINING_CONTRACT_PASS|G0_ONLY_REJECTED|EMPTY_CAD_MANUAL|REAL_CUT|ABC")
}
