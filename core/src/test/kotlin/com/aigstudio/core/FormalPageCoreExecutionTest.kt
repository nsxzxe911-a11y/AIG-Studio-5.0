package com.aigstudio.core

fun main() {
    val expectedPages=listOf("HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI","SETTINGS")
    check(StudioFormalPageContract.requiredPages==expectedPages) { "formal page inventory changed" }
    check(StudioFormalPageContract.MAX_VISIBLE_ACTIONS==4)

    expectedPages.forEach { page ->
        val actions=StudioFormalPageContract.actions(page)
        check(actions.isNotEmpty()) { "$page has no formal core actions" }
        check(actions.size<=StudioFormalPageContract.MAX_VISIBLE_ACTIONS) { "$page visible action overflow" }
        actions.forEach { action ->
            check(action.executesCoreBeforeNavigation) { "${action.command} navigates before core" }
            val route=StudioPageCoreCatalog.requireRoute(action.command)
            check(route.page==page) { "${action.command} route page mismatch" }
            check(route.coreTarget.isNotBlank()) { "${action.command} has no real core target" }
            check(route.effect!=StudioCoreEffect.NAVIGATION_ONLY) { "${action.command} is navigation-only" }
            check(route.effect!=StudioCoreEffect.PLACEHOLDER) { "${action.command} is placeholder" }
        }
    }
    check(StudioPageCoreCatalog.commands().size>=44) { "formal command inventory too small" }

    val axisState=StudioAxisRuntimeState()
    val six=StudioAxisPageRuntime(StudioAxisPageMode.AX6,axisState)
    check(!six.machineOutputEnabled) { "page JOG must never arm CNC machine output" }
    six.jog(StudioAxisChannel.A,0.001)
    six.jog(StudioAxisChannel.B,0.001)
    six.jog(StudioAxisChannel.C,0.001)
    check(axisState.a==0.001 && axisState.b==0.001 && axisState.c==0.001) { "6AX ABC runtime state did not mutate at 0.001 resolution" }
    check(StudioAxisPageRuntime(StudioAxisPageMode.AX3,StudioAxisRuntimeState()).supportedChannels==setOf(StudioAxisChannel.X,StudioAxisChannel.Y,StudioAxisChannel.Z))
    check(StudioAxisPageRuntime(StudioAxisPageMode.AX4,StudioAxisRuntimeState()).supportedChannels==setOf(StudioAxisChannel.X,StudioAxisChannel.Y,StudioAxisChannel.Z,StudioAxisChannel.A))
    check(StudioAxisPageRuntime(StudioAxisPageMode.AX5,StudioAxisRuntimeState()).supportedChannels==setOf(StudioAxisChannel.X,StudioAxisChannel.Y,StudioAxisChannel.Z,StudioAxisChannel.A,StudioAxisChannel.B))

    // Real core smoke: CAD history changes real geometry.
    val doc=DrawingDocument()
    val history=History(doc)
    history.run(AddEntitiesCommand(listOf(Line(a=Vec2(0.0,0.0),b=Vec2(20.0,0.0)))))
    check(doc.size()==1)
    check(history.undo())
    check(doc.size()==0)

    // Real CAM + true material removal.
    val snapshot=DrawingSnapshot(listOf(Line(a=Vec2(0.0,0.0),b=Vec2(20.0,0.0))))
    val settings=CamSettings(toolDiameter=4.0,depth=-2.0,safeZ=5.0,feedMmMin=150.0)
    val cam=CamModel.fromCad(1L,snapshot,settings)
    check(cam.toolpaths.isNotEmpty() && cam.toolpaths.any{it.moves.any{m->!m.rapid}}) { "CAM did not generate cutting toolpath" }
    val stock=Stock3D.fromSnapshot(snapshot,margin=5.0,thickness=10.0)
    val removed=MaterialRemoval3D.simulate(cam.toolpaths,settings,stock)
    check(removed.depth.any{it<0.0}) { "SIM did not remove material" }

    println("STUDIO_PAGE_CORE_EXECUTION_GATE_PASS|PAGES="+expectedPages.joinToString(",")+
        "|REAL_CAD_UNDO|REAL_CAM_TOOLPATH|REAL_SIM_MATERIAL_REMOVAL|XYZABC|0.001|MACHINE_OUTPUT_OFF|NO_NAV_ONLY|NO_PLACEHOLDER")
}
