package com.aigstudio.app.ui.pages.cad

import android.content.Context
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import com.aigstudio.app.RgbGlowButton
import com.aigstudio.core.ui.RuntimeAction
import com.aigstudio.core.ui.RuntimeActionKind
import com.aigstudio.core.ui.RuntimeActionSink

/** Fixed critical CAD actions plus function groups whose bodies are created only on first expansion. */
class CadToolGroups(
    context: Context,
    private val actions: RuntimeActionSink
) : LinearLayout(context) {
    private val groupBodies = linkedMapOf<String, ViewGroup>()
    private var expanded: String? = null

    private val groupFactories: Map<String, () -> ViewGroup> = linkedMapOf(
        "DRAW" to { rowOf(listOf("LINE", "RECT", "CIRCLE", "ARC", "HOLE"), RuntimeActionKind.TOOL) },
        "EDIT" to { rowOf(listOf("DELETE", "CHAMFER", "FILLET", "MEASURE"), RuntimeActionKind.EDIT) },
        "SNAP" to { rowOf(listOf("SNAP_TOGGLE", "GRID_TOGGLE", "GEOMETRY_TOGGLE"), RuntimeActionKind.COMMAND) },
        "FILE" to { rowOf(listOf("SAVE", "RECOVER"), RuntimeActionKind.COMMAND) }
    )

    init {
        orientation = VERTICAL
        addView(rowOf(listOf("UNDO", "REDO", "SELECT", "PAN", "FIT"), RuntimeActionKind.COMMAND))
        val headers = LinearLayout(context).apply { orientation = HORIZONTAL }
        groupFactories.keys.forEach { name ->
            headers.addView(button(name) { toggle(name) }, LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f))
        }
        addView(headers, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))
    }

    private fun rowOf(ids: List<String>, kind: RuntimeActionKind): ViewGroup =
        LinearLayout(context).apply {
            orientation = HORIZONTAL
            ids.forEach { id ->
                addView(button(id) { actions.dispatch(RuntimeAction(kind, id)) }, LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f))
            }
        }

    private fun button(label: String, run: () -> Unit): View = RgbGlowButton(context).apply {
        text = label
        contentDescription = "CAD $label"
        setRgbState(0xFF27E9FF.toInt(), false)
        setOnClickListener { run() }
    }

    private fun toggle(name: String) {
        expanded?.let { old -> groupBodies[old]?.let(::removeView) }
        if (expanded == name) {
            expanded = null
            return
        }
        val body = groupBodies.getOrPut(name) { groupFactories.getValue(name).invoke() }
        addView(body, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))
        expanded = name
    }
}
