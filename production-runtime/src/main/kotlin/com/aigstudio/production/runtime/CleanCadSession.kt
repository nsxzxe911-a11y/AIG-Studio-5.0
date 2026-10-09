package com.aigstudio.production.runtime

import com.aigstudio.core.AddEntitiesCommand
import com.aigstudio.core.CNC_RESOLUTION_MM
import com.aigstudio.core.CadEditEngine
import com.aigstudio.core.Circle
import com.aigstudio.core.DrawingDocument
import com.aigstudio.core.Entity
import com.aigstudio.core.History
import com.aigstudio.core.Line
import com.aigstudio.core.Vec2
import kotlin.math.abs
import kotlin.math.hypot
import kotlin.math.min

sealed interface CleanCadPrimitive {
    val selected:Boolean
    data class Segment(val ax:Double,val ay:Double,val bx:Double,val by:Double,override val selected:Boolean=false):CleanCadPrimitive
    data class CircleShape(val cx:Double,val cy:Double,val radius:Double,override val selected:Boolean=false):CleanCadPrimitive
}

class CleanCadSession {
    private val document=DrawingDocument()
    private val history=History(document)
    private val selectedIds=linkedSetOf<String>()

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

    fun selectNearest(x:Double,y:Double,multiSelect:Boolean=false,toleranceMm:Double=3.0):Boolean {
        requireFinite(x,y,toleranceMm); require(toleranceMm>=CNC_RESOLUTION_MM)
        val hit=document.all().map { it to distanceTo(it,x,y) }.minByOrNull { it.second }
        if(hit==null || hit.second>toleranceMm) { if(!multiSelect) selectedIds.clear(); return false }
        val id=hit.first.id
        if(!multiSelect) { selectedIds.clear(); selectedIds.add(id) }
        else if(id in selectedIds) selectedIds.remove(id) else selectedIds.add(id)
        return true
    }

    fun selectedCount():Int=selectedIds.size
    fun clearSelection(){ selectedIds.clear() }
    fun trimSelected(){ history.run(CadEditEngine.trimCommand(document,selectedIds.toList())); selectedIds.clear() }
    fun extendSelected(){ history.run(CadEditEngine.extendCommand(document,selectedIds.toList())); selectedIds.clear() }
    fun offsetSelected(distance:Double){ history.run(CadEditEngine.offsetCommand(document,selectedIds,distance)); selectedIds.clear() }
    fun arraySelected(count:Int,dx:Double,dy:Double){ history.run(CadEditEngine.linearArrayCommand(document,selectedIds,count,dx,dy)); selectedIds.clear() }

    fun undo():Boolean { selectedIds.clear(); return history.undo() }
    fun redo():Boolean { selectedIds.clear(); return history.redo() }
    fun entityCount():Int=document.size()
    fun primitives():List<CleanCadPrimitive> = document.all().mapNotNull { e ->
        when(e) {
            is Line -> CleanCadPrimitive.Segment(e.a.x,e.a.y,e.b.x,e.b.y,e.id in selectedIds)
            is Circle -> CleanCadPrimitive.CircleShape(e.center.x,e.center.y,e.radius,e.id in selectedIds)
            else -> null
        }
    }

    private fun distanceTo(e:Entity,x:Double,y:Double):Double = when(e) {
        is Line -> pointSegmentDistance(x,y,e.a.x,e.a.y,e.b.x,e.b.y)
        is Circle -> abs(hypot(x-e.center.x,y-e.center.y)-e.radius)
        else -> Double.POSITIVE_INFINITY
    }

    private fun pointSegmentDistance(px:Double,py:Double,ax:Double,ay:Double,bx:Double,by:Double):Double {
        val dx=bx-ax; val dy=by-ay; val len2=dx*dx+dy*dy
        if(len2<=0.0) return hypot(px-ax,py-ay)
        val t=(((px-ax)*dx+(py-ay)*dy)/len2).coerceIn(0.0,1.0)
        return hypot(px-(ax+t*dx),py-(ay+t*dy))
    }

    private fun requireFinite(vararg values:Double) {
        require(values.all(Double::isFinite)) { "CAD coordinates must be finite" }
    }
}
