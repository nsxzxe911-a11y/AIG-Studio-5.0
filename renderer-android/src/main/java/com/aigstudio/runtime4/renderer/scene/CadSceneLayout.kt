package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import kotlin.math.max

object CadSceneLayout {
    private val primary = listOf("CAD.LINE","CAD.RECT","CAD.CIRCLE","CAD.HOLE","CAD.SELECT","CAD.UNDO","CAD.REDO","CAD.SNAP","CAD.TOOL_GROUP")
    private val advanced = listOf("CAD.TRIM","CAD.EXTEND","CAD.OFFSET","CAD.ARRAY","CAD.CHAMFER","CAD.FILLET","CAD.TOPOLOGY")

    fun nodes(widthPx: Float, heightPx: Float, density: Float, toolGroupExpanded: Boolean): List<SceneNode> {
        val touch = 48f * density
        val gap = 8f * density
        val landscape = widthPx > heightPx
        val columns = if (landscape) 8 else 5
        val button = max(touch, (widthPx - gap * (columns + 1)) / columns)
        fun bounds(index: Int): UiBounds {
            val col = index % columns
            val row = index / columns
            val left = gap + col * (button + gap)
            val top = gap + row * (touch + gap)
            return UiBounds(left, top, left + button, top + touch)
        }
        val nodes = mutableListOf<SceneNode>()
        val allTools = primary + advanced
        allTools.forEachIndexed { index, id ->
            val visible = id in primary || toolGroupExpanded
            nodes += RgbGlassButtonNode(
                id = id,
                bounds = bounds(index),
                z = if (id in advanced) 40 else 30,
                label = id.substringAfter("CAD."),
                textureRef = textureFor(id),
                commandBinding = commandFor(id),
                visible = visible,
            )
        }
        val rows = (allTools.size + columns - 1) / columns
        val toolbarBottom = gap + rows * (touch + gap)
        val navTop = heightPx - touch - gap
        nodes += SceneNode("CAD.VIEWPORT", UiBounds(gap, toolbarBottom, widthPx - gap, navTop - gap), 1)
        nodes += RgbGlassButtonNode("NAV.HOME", UiBounds(gap, navTop, gap + touch, navTop + touch), 50, "HOME", null, null)
        nodes += RgbGlassButtonNode("NAV.CAD", UiBounds(gap * 2 + touch, navTop, gap * 2 + touch * 2, navTop + touch), 50, "CAD", null, null, VisualState.SELECTED)
        return nodes
    }

    fun commandFor(id: String): CadCommand? = when (id) {
        "CAD.LINE" -> CadCommand.SelectTool(CadTool.LINE)
        "CAD.RECT" -> CadCommand.SelectTool(CadTool.RECT)
        "CAD.CIRCLE" -> CadCommand.SelectTool(CadTool.CIRCLE)
        "CAD.HOLE" -> CadCommand.SelectTool(CadTool.HOLE)
        "CAD.SELECT" -> CadCommand.SelectTool(CadTool.SELECT)
        "CAD.UNDO" -> CadCommand.Undo
        "CAD.REDO" -> CadCommand.Redo
        "CAD.SNAP" -> CadCommand.CycleSnap
        "CAD.TRIM" -> CadCommand.Trim
        "CAD.EXTEND" -> CadCommand.Extend
        "CAD.OFFSET" -> CadCommand.Offset(5.0)
        "CAD.ARRAY" -> CadCommand.Array(3, 10.0, 0.0)
        "CAD.CHAMFER" -> CadCommand.Chamfer(5.0)
        "CAD.FILLET" -> CadCommand.Fillet(5.0)
        "CAD.TOPOLOGY" -> CadCommand.ToggleTopology
        else -> null
    }

    private fun textureFor(id: String): String? = when (id) {
        "CAD.LINE" -> "aig-rgb/icons/line.png"
        "CAD.RECT" -> "aig-rgb/icons/rect.png"
        "CAD.CIRCLE" -> "aig-rgb/icons/circle.png"
        "CAD.HOLE" -> "aig-rgb/icons/hole.png"
        "CAD.SELECT" -> "aig-rgb/icons/select.png"
        "CAD.TOOL_GROUP" -> "aig-rgb/icons/tool_group.png"
        else -> null
    }
}
