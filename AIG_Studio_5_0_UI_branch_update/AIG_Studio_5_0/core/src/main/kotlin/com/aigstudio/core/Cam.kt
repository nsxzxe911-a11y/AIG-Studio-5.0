package com.aigstudio.core

/** CAM receives a read-only geometry snapshot. It never receives DrawingDocument itself. */
class CamModel private constructor(
    val sourceRevision: Long,
    val geometry: DrawingSnapshot,
    val toolpaths: List<Toolpath>
) {
    companion object {
        fun fromCad(revision: Long, snapshot: DrawingSnapshot): CamModel =
            CamModel(revision, snapshot, emptyList())
    }
}

data class Toolpath(val moves: List<Move>)
sealed interface Move { val to: Vec2 }
data class Rapid(override val to: Vec2) : Move
data class Feed(override val to: Vec2, val feedMmMin: Double) : Move
