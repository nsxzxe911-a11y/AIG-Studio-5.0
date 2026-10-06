package com.aigstudio.app.ui.pages.cad

import com.aigstudio.core.Arc
import com.aigstudio.core.Circle
import com.aigstudio.core.DrawingDocument
import com.aigstudio.core.Geometry
import com.aigstudio.core.Line
import com.aigstudio.core.SnapMode
import com.aigstudio.core.Vec2
import kotlin.math.sqrt

/**
 * Caches geometry-derived snap candidates by authoritative geometry revision.
 * Pointer MOVE may query this cache, but pairwise intersections are rebuilt only
 * when geometry or the enabled snap-mode set changes.
 */
class CadSnapCandidateCache {
    var cachedRevision: Long = Long.MIN_VALUE
        private set
    var cachedModeKey: String = ""
        private set

    private var staticCandidates: List<Vec2> = emptyList()
    private var tangentFeatures: List<Pair<Vec2, Double>> = emptyList()

    fun snap(
        doc: DrawingDocument,
        p: Vec2,
        tolerance: Double,
        revision: Long,
        modes: Set<SnapMode> = SnapMode.entries.toSet(),
        reference: Vec2? = null
    ): Vec2? {
        require(tolerance.isFinite() && tolerance > 0.0)
        val modeKey = modes.map { it.name }.sorted().joinToString("|")
        if (revision != cachedRevision || modeKey != cachedModeKey) {
            rebuild(doc, revision, modeKey, modes)
        }

        val candidates = ArrayList<Vec2>(staticCandidates.size + tangentFeatures.size * 2 + 2)
        candidates.addAll(staticCandidates)
        reference?.let { ref ->
            if (SnapMode.HORIZONTAL in modes) candidates += Vec2(p.x, ref.y)
            if (SnapMode.VERTICAL in modes) candidates += Vec2(ref.x, p.y)
        }
        if (SnapMode.TANGENT in modes) {
            tangentFeatures.forEach { (center, radius) ->
                candidates += tangentPoints(p, center, radius)
            }
        }
        return candidates.minByOrNull { it.distanceTo(p) }
            ?.takeIf { it.distanceTo(p) <= tolerance }
    }

    private fun rebuild(
        doc: DrawingDocument,
        revision: Long,
        modeKey: String,
        modes: Set<SnapMode>
    ) {
        val candidates = mutableListOf<Vec2>()
        val tangents = mutableListOf<Pair<Vec2, Double>>()
        val entities = doc.all()
        entities.forEach { entity ->
            when (entity) {
                is Line -> {
                    if (SnapMode.ENDPOINT in modes) {
                        candidates += entity.a
                        candidates += entity.b
                    }
                    if (SnapMode.MIDPOINT in modes) {
                        candidates += Vec2(
                            (entity.a.x + entity.b.x) / 2.0,
                            (entity.a.y + entity.b.y) / 2.0
                        )
                    }
                }
                is Circle -> {
                    if (SnapMode.CENTER in modes) candidates += entity.center
                    if (SnapMode.TANGENT in modes) tangents += entity.center to entity.radius
                }
                is Arc -> {
                    if (SnapMode.ENDPOINT in modes) {
                        candidates += entity.start
                        candidates += entity.end
                    }
                    if (SnapMode.CENTER in modes) candidates += entity.center
                    if (SnapMode.TANGENT in modes) tangents += entity.center to entity.radius
                }
            }
        }
        if (SnapMode.INTERSECTION in modes) {
            val lines = entities.filterIsInstance<Line>()
            for (i in lines.indices) for (j in i + 1 until lines.size) {
                Geometry.lineIntersection(lines[i], lines[j])?.let { hit ->
                    if (hit.t1 in -EPS..1.0 + EPS && hit.t2 in -EPS..1.0 + EPS) {
                        candidates += hit.point
                    }
                }
            }
        }
        staticCandidates = candidates
        tangentFeatures = tangents
        cachedRevision = revision
        cachedModeKey = modeKey
    }

    private fun tangentPoints(p: Vec2, c: Vec2, r: Double): List<Vec2> {
        val dx = p.x - c.x
        val dy = p.y - c.y
        val d2 = dx * dx + dy * dy
        if (d2 <= r * r + EPS) return emptyList()
        val l = r * r / d2
        val m = r * sqrt(d2 - r * r) / d2
        return listOf(
            Vec2(c.x + l * dx - m * dy, c.y + l * dy + m * dx),
            Vec2(c.x + l * dx + m * dy, c.y + l * dy - m * dx)
        )
    }

    private companion object {
        const val EPS = 1e-9
    }
}
