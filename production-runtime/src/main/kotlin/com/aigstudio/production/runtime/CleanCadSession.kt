package com.aigstudio.production.runtime

import com.aigstudio.core.AddEntitiesCommand
import com.aigstudio.core.CNC_RESOLUTION_MM
import com.aigstudio.core.Circle
import com.aigstudio.core.DrawingDocument
import com.aigstudio.core.History
import com.aigstudio.core.Line
import com.aigstudio.core.Vec2
import kotlin.math.abs

sealed interface CleanCadPrimitive {
    data class Segment(val ax:Double,val ay:Double,val bx:Double,val by:Double):CleanCadPrimitive
    data class CircleShape(val cx:Double,val cy:Double,val radius:Double):CleanCadPrimitive
}

class CleanCadSession {
    private val document=DrawingDocument()
    private val history=History(document)

    fun addLine(ax:Double,ay:Double,bx:Double,by:Double) {
        requireFinite(ax,ay,bx,by)
        require(abs(bx-ax)>=CNC_RESOLUTION_MM || abs(by-ay)>=CNC_RESOLUTION_MM) { "LINE must span at least 0.001 mm" }
        history.run(AddEntitiesCommand(listOf(Line(a=Vec2(ax,ay),b=Vec2(bx,by)))))
    }

    fun addRect(x1:Double,y1:Double,x2:Double,y2:Double) {
        requireFinite(x1,y1,x2,y2)
        require(abs(x2-x1)>=CNC_RESOLUTION_MM && abs(y2-y1)>=CNC_RESOLUTION_MM) { "RECT width/height must be at least 0.001 mm" }
        val a=Vec2(x1,y1); val b=Vec2(x2,y1); val c=Vec2(x2,y2); val d=Vec2(x1,y2)
        history.run(AddEntitiesCommand(listOf(Line(a=a,b=b),Line(a=b,b=c),Line(a=c,b=d),Line(a=d,b=a))))
    }

    fun addCircle(cx:Double,cy:Double,radius:Double) {
        requireFinite(cx,cy,radius)
        require(radius>=CNC_RESOLUTION_MM) { "CIRCLE radius must be at least 0.001 mm" }
        history.run(AddEntitiesCommand(listOf(Circle(center=Vec2(cx,cy),radius=radius))))
    }

    fun undo():Boolean=history.undo()
    fun redo():Boolean=history.redo()
    fun entityCount():Int=document.size()
    fun primitives():List<CleanCadPrimitive> = document.all().mapNotNull { e ->
        when(e) {
            is Line -> CleanCadPrimitive.Segment(e.a.x,e.a.y,e.b.x,e.b.y)
            is Circle -> CleanCadPrimitive.CircleShape(e.center.x,e.center.y,e.radius)
            else -> null
        }
    }

    private fun requireFinite(vararg values:Double) {
        require(values.all(Double::isFinite)) { "CAD coordinates must be finite" }
    }
}
