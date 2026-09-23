package com.aigstudio.core

import kotlin.math.abs

enum class IssueSeverity { INFO, WARNING, DANGER }

data class AiIssue(
    val severity: IssueSeverity,
    val code: String,
    val message: String,
    val entityIds: List<EntityId> = emptyList()
)

data class AiInspection(val issues: List<AiIssue>) {
    val dangerCount get() = issues.count { it.severity == IssueSeverity.DANGER }
    val warningCount get() = issues.count { it.severity == IssueSeverity.WARNING }
    val isSafeForCam get() = dangerCount == 0
}

/** Local, deterministic pre-CAM inspection. It never changes geometry automatically. */
object AiCadInspector {
    fun inspect(snapshot: DrawingSnapshot): AiInspection {
        val issues = mutableListOf<AiIssue>()
        val entities = snapshot.entities

        entities.forEach { e ->
            when (e) {
                is Line -> if (e.length <= CNC_RESOLUTION_MM) issues += AiIssue(IssueSeverity.DANGER, "SHORT_LINE", "極短線/零長度線，CAM 前必須確認", listOf(e.id))
                is Circle -> if (e.radius <= CNC_RESOLUTION_MM) issues += AiIssue(IssueSeverity.DANGER, "TINY_CIRCLE", "圓半徑過小，CAM 前必須確認", listOf(e.id))
                is Arc -> if (e.radius <= CNC_RESOLUTION_MM || e.start.distanceTo(e.end) <= CNC_RESOLUTION_MM) issues += AiIssue(IssueSeverity.DANGER, "TINY_ARC", "圓弧尺寸異常，CAM 前必須確認", listOf(e.id))
            }
        }

        for (i in entities.indices) for (j in i + 1 until entities.size) {
            val a = entities[i]
            val b = entities[j]
            if (sameGeometry(a, b)) issues += AiIssue(IssueSeverity.WARNING, "DUPLICATE", "發現重疊/重複幾何", listOf(a.id, b.id))
        }

        val endpoints = entities.filterIsInstance<Line>().flatMap { l -> listOf(l.id to l.a, l.id to l.b) }
        for (i in endpoints.indices) for (j in i + 1 until endpoints.size) {
            val (id1, p1) = endpoints[i]; val (id2, p2) = endpoints[j]
            if (id1 == id2) continue
            val d = p1.distanceTo(p2)
            if (d > EPS && d <= JOIN_TOLERANCE_MM) issues += AiIssue(IssueSeverity.WARNING, "NEAR_GAP", "端點非常接近但未連接（${"%.4f".format(d)}）", listOf(id1, id2))
        }
        return AiInspection(issues.distinctBy { it.code to it.entityIds.sorted() })
    }

    private fun sameGeometry(a: Entity, b: Entity): Boolean = when {
        a is Line && b is Line -> (near(a.a,b.a) && near(a.b,b.b)) || (near(a.a,b.b) && near(a.b,b.a))
        a is Circle && b is Circle -> near(a.center,b.center) && abs(a.radius-b.radius) <= JOIN_TOLERANCE_MM
        else -> false
    }
    private fun near(a: Vec2, b: Vec2) = a.distanceTo(b) <= JOIN_TOLERANCE_MM
}
