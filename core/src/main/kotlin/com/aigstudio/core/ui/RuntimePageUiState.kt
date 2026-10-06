package com.aigstudio.core.ui

enum class EditorSide {
    LEFT,
    RIGHT
}

data class BottomDescription(
    val text: String,
    val accessibilityText: String
)

data class RuntimePageUiState(
    val surface: RuntimeSurface,
    val selectedSide: EditorSide,
    val bottomDescription: BottomDescription
)

fun RuntimePageUiState.selectSide(
    side: EditorSide,
    resolver: (RuntimeSurface, EditorSide) -> BottomDescription
): RuntimePageUiState = copy(
    selectedSide = side,
    bottomDescription = resolver(surface, side)
)
