package com.aigstudio.app.ui.pages.cad

import android.content.Context
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import com.aigstudio.app.RgbGlowButton
import com.aigstudio.app.ui.AndroidRuntimeUiModule
import com.aigstudio.core.ui.BottomDescription
import com.aigstudio.core.ui.EditorSide
import com.aigstudio.core.ui.RuntimeActionSink
import com.aigstudio.core.ui.RuntimePageUiState
import com.aigstudio.core.ui.RuntimeSurface
import com.aigstudio.core.ui.RuntimeViewport
import com.aigstudio.core.ui.selectSide

/**
 * One-editor CAD Runtime page. The approved RGB visual stays in RuntimePageHost;
 * this module owns only real controls, the proven CadView and one description pane.
 */
class CadPageModule(
    private val contentFactory: () -> View,
    private val callbackBridge: RuntimeActionSink
) : AndroidRuntimeUiModule {
    override val surface: RuntimeSurface = RuntimeSurface.CAD

    override fun create(
        context: Context,
        viewport: RuntimeViewport,
        actions: RuntimeActionSink
    ): View {
        var state = RuntimePageUiState(
            surface = RuntimeSurface.CAD,
            selectedSide = EditorSide.LEFT,
            bottomDescription = description(EditorSide.LEFT)
        )
        val root = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            contentDescription = "AIG CAD ONE EDITOR RUNTIME"
            setPadding(if (viewport.compact) 6 else 10, 6, if (viewport.compact) 6 else 10, 6)
        }
        val descriptionPane = CadDescriptionPane(context)
        val left = sideButton(context, "LEFT")
        val right = sideButton(context, "RIGHT")

        fun renderSide(side: EditorSide) {
            state = state.selectSide(side) { _, selected -> description(selected) }
            left.setRgbState(0xFF27E9FF.toInt(), side == EditorSide.LEFT)
            right.setRgbState(0xFF27E9FF.toInt(), side == EditorSide.RIGHT)
            descriptionPane.render(state)
        }

        val sideBar = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            addView(left, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
            addView(right, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        }
        left.setOnClickListener { renderSide(EditorSide.LEFT) }
        right.setOnClickListener { renderSide(EditorSide.RIGHT) }

        val tools = CadToolGroups(context, callbackBridge)
        val editor = contentFactory()
        (editor.parent as? ViewGroup)?.removeView(editor)
        editor.contentDescription = "AIG CAD AUTHORITATIVE EDITOR"

        root.addView(sideBar, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
        root.addView(tools, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
        root.addView(editor, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))
        root.addView(descriptionPane, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
        renderSide(EditorSide.LEFT)
        return root
    }

    private fun sideButton(context: Context, label: String) = RgbGlowButton(context).apply {
        text = label
        contentDescription = "CAD EDITOR SIDE $label"
        setRgbState(0xFF27E9FF.toInt(), false)
    }

    private fun description(side: EditorSide): BottomDescription = when (side) {
        EditorSide.LEFT -> BottomDescription(
            "CAD • DRAW / EDIT • 0.001 mm • 單一編輯器",
            "CAD 左側工具與幾何編輯說明"
        )
        EditorSide.RIGHT -> BottomDescription(
            "CAD • SNAP / VIEW / FILE • 快取交點 • MOVE 不重算幾何",
            "CAD 右側捕捉檢視與檔案說明"
        )
    }
}
