package com.aigstudio.app.ui.pages.cad

import android.content.Context
import android.graphics.Color
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.TextView
import com.aigstudio.core.ui.RuntimePageUiState

/** One accessibility-visible CAD description node; LEFT/RIGHT replaces its text atomically. */
class CadDescriptionPane(context: Context) : FrameLayout(context) {
    private val label = TextView(context).apply {
        setTextColor(Color.WHITE)
        textSize = 12f
        gravity = Gravity.CENTER_VERTICAL
        setPadding(16, 8, 16, 8)
        importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_YES
    }

    init {
        setBackgroundColor(Color.argb(210, 7, 17, 27))
        addView(label, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))
    }

    fun render(state: RuntimePageUiState) {
        val selectedSide = state.selectedSide
        val bottomDescription = state.bottomDescription
        label.text = bottomDescription.text
        label.contentDescription = bottomDescription.accessibilityText + " • " + selectedSide.name
    }
}
