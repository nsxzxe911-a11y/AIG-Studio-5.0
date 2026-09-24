package com.aigstudio.core

import java.util.Locale
import kotlin.math.max

enum class DrillCycle(val code: String) { G81("G81"), G73("G73"), G83("G83"), G84("G84") }

data class FanucPostSettings(
    val workOffset: String = "G54",
    val tool: Int = 1,
    val h: Int = 1,
    val spindle: Int = 2300,
    val coolant: Boolean = true,
    val toolChangeSubprogram: Int = 4,
    val endSubprogram: Int = 5,
    val axisA: Double = 0.0,
    val axisB: Double = 0.0
) {
    init {
        require(Regex("G5[4-9]").matches(workOffset))
        require(tool in 1..999)
        require(h in 1..999)
        require(spindle in 1..99999)
        require(toolChangeSubprogram in 1..9999)
        require(endSubprogram in 1..9999)
        require(axisA in -360.0..360.0)
        require(axisB in -360.0..360.0)
    }
}

data class DrillHole(
    val x: Double,
    val y: Double,
    val z: Double,
    val r: Double,
    val k: Double? = null,
    val feed: Double = 120.0,
    val tapPitchMm: Double? = null,
    val tapSpindleRpm: Int? = null,
    val rigidTapM29: Boolean = false
)

object FanucNc {
    fun generate(cam: CamModel, post: FanucPostSettings = FanucPostSettings()): String {
        require(cam.toolpaths.isNotEmpty()) { "CAM generated no toolpaths" }
        val s = cam.settings
        val out = StringBuilder()
        out.appendLine("%")
        out.appendLine("O1000 (AIG CNC)")
        out.appendLine("G90 " + post.workOffset + " G17 G40 G49 G80")
        out.appendLine("T" + post.tool)
        out.appendLine("M98 P" + post.toolChangeSubprogram)
        out.appendLine("S" + post.spindle + " M3")
        if (kotlin.math.abs(post.axisA) > 1e-9 || kotlin.math.abs(post.axisB) > 1e-9) {
            out.append("G0 A").append(fmt(post.axisA)).append(" B").append(fmt(post.axisB)).appendLine()
        }
        out.append("G43 Z").append(fmt(max(s.safeZ, 30.0))).append(" H").append(post.h)
        if (post.coolant) out.append(" M8")
        out.appendLine()
        cam.toolpaths.forEach { path ->
            path.moves.forEach { move ->
                when (move) {
                    is Rapid -> out.append("G0 X").append(fmt(move.to.x)).append(" Y").append(fmt(move.to.y)).append(" Z").append(fmt(move.z)).appendLine()
                    is Feed -> out.append("G1 X").append(fmt(move.to.x)).append(" Y").append(fmt(move.to.y)).append(" Z").append(fmt(move.z))
                        .append(" F").append(fmt(move.feedMmMin)).appendLine()
                    is ArcFeed -> out.append(if (move.clockwise) "G2" else "G3")
                        .append(" X").append(fmt(move.to.x)).append(" Y").append(fmt(move.to.y)).append(" Z").append(fmt(move.z))
                        .append(" I").append(fmt(move.centerOffset.x)).append(" J").append(fmt(move.centerOffset.y))
                        .append(" F").append(fmt(move.feedMmMin)).appendLine()
                }
            }
        }
        out.appendLine("G0 Z" + fmt(max(s.safeZ, 30.0)))
        out.appendLine("G80")
        out.appendLine("M98 P" + post.endSubprogram)
        out.appendLine("M30")
        out.appendLine("%")
        return out.toString()
    }

    fun cannedCycle(cycle: DrillCycle, holes: List<DrillHole>, safeZ: Double, retractZ: Double = 2.0): String {
        require(holes.isNotEmpty())
        require(safeZ > retractZ && retractZ >= 0.0)
        val out = StringBuilder()
        out.appendLine("G0 Z" + fmt(safeZ))
        holes.forEachIndexed { index, h ->
            require(h.z < 0.0 && h.feed > 0.0)
            if (index == 0) {
                if (cycle == DrillCycle.G84) {
                    val pitch = h.tapPitchMm ?: error("G84 requires tap pitch mm/rev")
                    val rpm = h.tapSpindleRpm ?: error("G84 requires tapping spindle RPM")
                    require(pitch > 0.0 && rpm in 1..99999)
                    if (h.rigidTapM29) out.appendLine("M29 S" + rpm)
                    out.append("G84 X").append(fmt(h.x)).append(" Y").append(fmt(h.y))
                        .append(" Z").append(fmt(h.z)).append(" R").append(fmt(retractZ))
                        .append(" F").append(fmt(pitch * rpm)).appendLine()
                } else {
                    out.append(cycle.code).append(" X").append(fmt(h.x)).append(" Y").append(fmt(h.y)).append(" Z").append(fmt(h.z)).append(" R").append(fmt(retractZ))
                    if (cycle == DrillCycle.G73 || cycle == DrillCycle.G83) {
                        val q = h.k ?: error(cycle.code + " requires K/Q peck value")
                        require(q > 0.0)
                        out.append(" Q").append(fmt(q))
                    }
                    out.append(" F").append(fmt(h.feed)).appendLine()
                }
            } else out.append("X").append(fmt(h.x)).append(" Y").append(fmt(h.y)).appendLine()
        }
        out.appendLine("G80")
        return out.toString()
    }

    fun insertBeforeProgramEnd(program: String, block: String, endSubprogram: Int = 5): String {
        require(block.isNotBlank()) { "NC block is empty" }
        val normalized = program.replace("\r\n", "\n")
        val marker = "M98 P" + endSubprogram
        val index = normalized.indexOf("\n" + marker + "\n")
        require(index >= 0) { "Fanuc program end marker not found" }
        val before = normalized.substring(0, index + 1).trimEnd()
        val after = normalized.substring(index + 1)
        return before + "\n" + block.trim() + "\n" + after
    }

    fun fmt(v: Double): String {
        var s = String.format(Locale.US, "%.3f", v)
        while (s.contains('.') && s.endsWith('0')) s = s.dropLast(1)
        if (s.endsWith('.')) return s
        if (!s.contains('.')) s += "."
        return s
    }
}

data class MachiningRiskReport(val collisionCount: Int, val overcutCount: Int, val warnings: List<String>) {
    val ok: Boolean get() = collisionCount == 0 && overcutCount == 0
}

object MachiningRiskScanner {
    fun inspect(cam: CamModel, stock: Stock3D): MachiningRiskReport {
        var collisions = 0
        var overcuts = 0
        val warnings = mutableListOf<String>()
        val bottom = -stock.thickness
        cam.toolpaths.forEachIndexed { pathIndex, path ->
            path.moves.forEachIndexed { moveIndex, move ->
                if (move.rapid && move.z + 1e-9 < cam.settings.safeZ) {
                    collisions++
                    warnings += "Rapid below Safe-Z at path=" + pathIndex + " move=" + moveIndex
                }
                if (!move.rapid && move.z < bottom - CNC_RESOLUTION_MM) {
                    overcuts++
                    warnings += "Cut below stock bottom at path=" + pathIndex + " move=" + moveIndex
                }
                val outside = move.to.x < stock.minX || move.to.x > stock.maxX || move.to.y < stock.minY || move.to.y > stock.maxY
                if (!move.rapid && outside) {
                    overcuts++
                    warnings += "Cut outside stock XY at path=" + pathIndex + " move=" + moveIndex
                }
            }
        }
        return MachiningRiskReport(collisions, overcuts, warnings.distinct())
    }
}