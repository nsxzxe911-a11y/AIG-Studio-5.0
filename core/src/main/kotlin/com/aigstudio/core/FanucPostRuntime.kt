package com.aigstudio.core

import java.util.Locale
import kotlin.math.abs

object FanucPostRuntime {
    const val PROFILE="FANUC"

    private fun fmt(v:Double):String {
        require(v.isFinite()){"NC value must be finite"}
        val clean=if(abs(v)<0.0005)0.0 else v
        return String.format(Locale.US,"%.3f",clean)
    }

    private fun axisWords(move:Move):String=buildString {
        if(abs(move.axisA)>=0.0005) append(" A").append(fmt(move.axisA))
        if(abs(move.axisB)>=0.0005) append(" B").append(fmt(move.axisB))
        if(abs(move.axisC)>=0.0005) append(" C").append(fmt(move.axisC))
    }

    fun generate(
        toolpaths:List<Toolpath>,
        safeZ:Double,
        compensation:String="G40",
        programNumber:Int=1,
        toolNumber:Int=1,
        hNumber:Int=1,
        spindleRpm:Int=2300,
    ):String {
        require(toolpaths.isNotEmpty()){ "Fanuc post requires toolpath" }
        require(toolpaths.any{p->p.moves.any{!it.rapid}}){ "Fanuc post requires cutting motion" }
        require(safeZ.isFinite() && safeZ>0.0){ "Fanuc post Safe-Z must be positive" }
        require(compensation in setOf("G40","G41","G42")){ "Unsupported cutter compensation: $compensation" }
        require(programNumber in 1..9999){ "Program number must be 1..9999" }
        require(toolNumber in 1..999){ "Tool number must be 1..999" }
        require(hNumber in 1..999){ "H number must be 1..999" }
        require(spindleRpm in 1..99999){ "Spindle RPM must be positive" }
        return buildString {
            appendLine("%")
            appendLine("O"+programNumber.toString().padStart(4,'0'))
            appendLine("G90 G54")
            appendLine("T$toolNumber M6")
            appendLine("S$spindleRpm M3")
            appendLine("G43 Z${fmt(safeZ)} H$hNumber M8")
            if(compensation!="G40") appendLine(compensation)
            toolpaths.forEach { path ->
                path.moves.forEach { move ->
                    when(move) {
                        is Rapid -> appendLine("G0 X${fmt(move.to.x)} Y${fmt(move.to.y)} Z${fmt(move.z)}${axisWords(move)}")
                        is Feed -> appendLine("G1 X${fmt(move.to.x)} Y${fmt(move.to.y)} Z${fmt(move.z)}${axisWords(move)} F${fmt(move.feedMmMin)}")
                        is ArcFeed -> appendLine("${if(move.clockwise)"G2" else "G3"} X${fmt(move.to.x)} Y${fmt(move.to.y)} Z${fmt(move.z)} I${fmt(move.centerOffset.x)} J${fmt(move.centerOffset.y)}${axisWords(move)} F${fmt(move.feedMmMin)}")
                    }
                }
            }
            appendLine("G40")
            appendLine("G0 Z${fmt(safeZ)}")
            appendLine("M9")
            appendLine("M5")
            appendLine("M99")
            append("%")
        }
    }
}
