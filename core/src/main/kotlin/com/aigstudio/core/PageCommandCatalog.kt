package com.aigstudio.core

data class PageCommandDefinition(
    val commandId: String,
    val page: PageId,
    val allowedSubpages: Set<SubpageId>,
    val dangerClass: ButtonDangerClass = ButtonDangerClass.NORMAL,
    val requiresCoreResult: Boolean = true,
)

object PageCommandCatalog {
    private fun sub(id: String) = PageCatalog.requireSubpage(id)

    private fun def(
        id: String,
        page: PageId,
        vararg subpages: String,
        danger: ButtonDangerClass = ButtonDangerClass.NORMAL,
    ) = PageCommandDefinition(id, page, subpages.map(::sub).toSet(), danger)

    private fun axisDefinitions(page: PageId, prefix: String, axes: List<String>): List<PageCommandDefinition> {
        val machine = "$prefix.MACHINE"
        val ncFirst = "$prefix.NC_FIRST"
        val defs = mutableListOf(
            def("$prefix.MACHINE.VIEW", page, machine),
            def("$prefix.MACHINE.HOME_VIEW", page, machine),
            def("$prefix.NC_FIRST.OPEN", page, ncFirst),
            def("$prefix.NC_FIRST.PARSE", page, ncFirst),
            def("$prefix.NC_FIRST.PREVIEW", page, ncFirst),
        )
        axes.forEach { axis ->
            defs += def("$prefix.MACHINE.JOG_${axis}_POS", page, machine)
            defs += def("$prefix.MACHINE.JOG_${axis}_NEG", page, machine)
        }
        return defs
    }

    val definitions: List<PageCommandDefinition> = buildList {
        add(def("HOME.PROJECTS.OPEN", PageId.HOME, "HOME.PROJECTS"))
        add(def("HOME.PROJECTS.NEW", PageId.HOME, "HOME.PROJECTS"))
        add(def("HOME.PROJECTS.SAVE", PageId.HOME, "HOME.PROJECTS"))
        add(def("HOME.SETTINGS.OPEN", PageId.HOME, "HOME.SETTINGS"))
        add(def("HOME.SYNC.STATUS", PageId.HOME, "HOME.MAIN"))

        listOf("LINE","RECT","CIRCLE","ARC","HOLE").forEach { add(def("CAD.DRAW.$it", PageId.CAD, "CAD.DRAW")) }
        listOf("TRIM","EXTEND","OFFSET","ARRAY","CHAMFER","FILLET","UNDO","REDO").forEach { add(def("CAD.EDIT.$it", PageId.CAD, "CAD.EDIT")) }
        listOf("OPEN","SAVE","IMPORT","EXPORT").forEach { add(def("CAD.FILE.$it", PageId.CAD, "CAD.FILE")) }
        add(def("CAD.PHOTO.ALIGN", PageId.CAD, "CAD.PHOTO"))
        add(def("CAD.PHOTO.SCALE", PageId.CAD, "CAD.PHOTO"))
        add(def("CAD.VIEW.SNAP", PageId.CAD, "CAD.VIEW"))

        listOf("GENERATE","ROUGH","FINISH","CONTOUR","DRILL").forEach { add(def("CAM.AUTO.$it", PageId.CAM, "CAM.AUTO")) }
        listOf("ADD_POINT","EDIT_POINT","DELETE_POINT","SET_MOTION_G0","SET_MOTION_G1","SET_SAFE_Z").forEach { add(def("CAM.MANUAL.$it", PageId.CAM, "CAM.MANUAL")) }
        add(def("CAM.MAIN.COMP_G41", PageId.CAM, "CAM.MAIN"))
        add(def("CAM.MAIN.COMP_G42", PageId.CAM, "CAM.MAIN"))
        add(def("CAM.TOOL.SELECT", PageId.CAM, "CAM.TOOL"))
        add(def("CAM.REGION.SELECT", PageId.CAM, "CAM.REGION"))
        add(def("CAM.POST_PREVIEW.GENERATE", PageId.CAM, "CAM.POST_PREVIEW"))

        listOf("PLAY","PAUSE","SINGLE_BLOCK","STOP","RESET").forEach { add(def("SIM.PLAYBACK.$it", PageId.SIM, "SIM.PLAYBACK")) }
        add(def("SIM.MATERIAL.RUN", PageId.SIM, "SIM.MATERIAL"))
        add(def("SIM.COLLISION.CHECK", PageId.SIM, "SIM.COLLISION"))
        add(def("SIM.MAIN.VIEW_3D", PageId.SIM, "SIM.MAIN"))
        add(def("SIM.RESULT.ACCEPT", PageId.SIM, "SIM.RESULT"))

        addAll(axisDefinitions(PageId.AX3, "3AX", listOf("X","Y","Z")))
        addAll(axisDefinitions(PageId.AX4, "4AX", listOf("X","Y","Z","A")))
        addAll(axisDefinitions(PageId.AX5, "5AX", listOf("X","Y","Z","A","B")))
        addAll(axisDefinitions(PageId.AX6, "6AX", listOf("X","Y","Z","A","B","C")))

        add(def("NC.EDITOR.INSERT", PageId.NC, "NC.EDITOR"))
        add(def("NC.EDITOR.DELETE", PageId.NC, "NC.EDITOR"))
        add(def("NC.EDITOR.BLOCK_SKIP", PageId.NC, "NC.EDITOR"))
        add(def("NC.EDITOR.CUSTOM_M_CODE", PageId.NC, "NC.EDITOR"))
        add(def("NC.PARSER.PARSE", PageId.NC, "NC.PARSER"))
        add(def("NC.PREVIEW.RENDER", PageId.NC, "NC.PREVIEW"))
        add(def("NC.VERIFY.RUN", PageId.NC, "NC.VERIFY"))
        add(def("NC.VERIFY.SINGLE_BLOCK", PageId.NC, "NC.VERIFY"))
        add(def("NC.VERIFY.DRY_RUN", PageId.NC, "NC.VERIFY"))
        add(def("NC.OUTPUT.PREPARE", PageId.NC, "NC.OUTPUT", danger = ButtonDangerClass.CAUTION))
        add(def("NC.OUTPUT.SEND_MACHINE", PageId.NC, "NC.OUTPUT", danger = ButtonDangerClass.CNC_OUTPUT))

        add(def("AI.ASSIST.EXPLAIN", PageId.AI, "AI.ASSIST"))
        add(def("AI.PLAN.BUILD", PageId.AI, "AI.PLAN"))
        add(def("AI.PLAN.OPTIMIZE", PageId.AI, "AI.PLAN"))
        add(def("AI.AUDIT.RUN", PageId.AI, "AI.AUDIT"))
        add(def("AI.RECOVERY.REPLAN", PageId.AI, "AI.RECOVERY"))
    }

    private val byId = definitions.associateBy { it.commandId }

    init {
        require(byId.size == definitions.size) { "Duplicate page command ID" }
        require(definitions.all { definition -> definition.allowedSubpages.all { it.page == definition.page } }) {
            "Command allowedSubpages must belong to command page"
        }
    }

    fun requireDefinition(commandId: String): PageCommandDefinition = byId[commandId]
        ?: error("Unknown page command: $commandId")

    fun commands(page: PageId): List<PageCommandDefinition> = definitions.filter { it.page == page }

    fun validate(command: PageCommand): PageCommandDefinition {
        val definition = requireDefinition(command.commandId)
        require(definition.page == command.page) {
            "Command ${command.commandId} belongs to ${definition.page.id}, not ${command.page.id}"
        }
        require(command.subpage in definition.allowedSubpages) {
            "Command ${command.commandId} is not available on ${command.subpage.value}"
        }
        return definition
    }
}
