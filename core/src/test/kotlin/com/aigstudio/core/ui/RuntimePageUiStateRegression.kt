package com.aigstudio.core.ui

fun main() {
    fun description(surface: RuntimeSurface, side: EditorSide): BottomDescription =
        BottomDescription(
            text = "${surface.name}:${side.name}",
            accessibilityText = "${surface.name} ${side.name} description"
        )

    var state = RuntimePageUiState(
        surface = RuntimeSurface.CAD,
        selectedSide = EditorSide.LEFT,
        bottomDescription = description(RuntimeSurface.CAD, EditorSide.LEFT)
    )

    repeat(100) { index ->
        val side = if (index % 2 == 0) EditorSide.RIGHT else EditorSide.LEFT
        state = state.selectSide(side, ::description)
    }

    check(state.selectedSide == EditorSide.LEFT) { "Expected final LEFT side after 100 alternating updates" }
    check(state.bottomDescription.text == "CAD:LEFT") { "Bottom description did not atomically follow final side" }
    check(state.bottomDescription.accessibilityText == "CAD LEFT description")

    val beforeViewportChange = state
    RuntimeResponsivePolicy.classify(360, 800, 3f)
    RuntimeResponsivePolicy.classify(800, 360, 3f)
    RuntimeResponsivePolicy.classify(900, 1200, 2f)
    check(state == beforeViewportChange) { "Viewport classification must not duplicate or mutate description state" }

    RuntimeSurface.entries.forEach { surface ->
        val page = RuntimePageUiState(
            surface = surface,
            selectedSide = EditorSide.LEFT,
            bottomDescription = description(surface, EditorSide.LEFT)
        )
        check(page.bottomDescription.text.startsWith(surface.name))
    }

    println("RUNTIME_PAGE_UI_STATE_REGRESSION_PASS")
}
