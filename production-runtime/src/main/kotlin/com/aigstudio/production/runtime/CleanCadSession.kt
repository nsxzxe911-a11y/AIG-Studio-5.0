package com.aigstudio.production.runtime

import com.aigstudio.core.AddEntitiesCommand
import com.aigstudio.core.Arc
import com.aigstudio.core.CNC_RESOLUTION_MM
import com.aigstudio.core.CadEditEngine
import com.aigstudio.core.CadSemanticIdentity
import com.aigstudio.core.CadSnapEngine
import com.aigstudio.core.SnapMode
import com.aigstudio.core.Circle
import com.aigstudio.core.DrawingDocument
import com.aigstudio.core.Entity
import com.aigstudio.core.History
import com.aigstudio.core.Line
import com.aigstudio.core.Vec2
import com.aigstudio.core.chamferCommand
import com.aigstudio.core.filletCommand
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.hypot

enum class CleanCadSnapMode { ENDPOINT, MIDPOINT, CENTER, INTERSECTION, TANGENT, HORIZONTAL, VERTICAL }
data class CleanCadSnapPoint(val x:Double,val y:Double)

sealed interface CleanCadPrimitive {
    val selected:Boolean
    data class Segment(val ax:Double,val ay:Double,val bx:Double,val by:Double,override val selected:Boolean=false):CleanCadPrimitive
    data class CircleShape(val cx:Double,val cy:Double,val radius:Double,override val selected:Boolean=false):CleanCadPrimitive
    data class HoleShape(val cx:Double,val cy:Double,val radius:Double,override val selected:Boolean=false):CleanCadPrimitive
    data class ArcShape(val cx:Double,val cy:Double,val radius:Double,val startDeg:Double,val sweepDeg:Double,override val selected:Boolean=false):CleanCadPrimitive
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

    fun addHole(cx:Double,cy:Double,diameter:Double) {
        requireFinite(cx,cy,diameter)
        require(diameter>=CNC_RESOLUTION_MM*2.0) { "HOLE diameter must be at least 0.002 mm" }
        history.run(AddEntitiesCommand(listOf(Circle(id=CadSemanticIdentity.newHoleId(),center=Vec2(cx,cy),radius=diameter/2.0))))
    }

    fun snapPoint(x:Double,y:Double,tolerance:Double,mode:CleanCadSnapMode,referenceX:Double?=null,referenceY:Double?=null):CleanCadSnapPoint? {
        requireFinite(x,y,tolerance); require(tolerance>0.0)
        require((referenceX==null)==(referenceY==null)){"Snap reference requires both X and Y"}
        val ref=if(referenceX!=null&&referenceY!=null) Vec2(referenceX,referenceY) else null
        val q=CadSnapEngine.snapTo(document,Vec2(x,y),tolerance,setOf(SnapMode.valueOf(mode.name)),ref) ?: return null
        return CleanCadSnapPoint(q.x,q.y)
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
    fun chamferSelected(distance:Double) {
        val ids=selectedIds.toList(); require(ids.size==2){"CHAMFER requires two selected lines"}
        history.run(chamferCommand(document,ids[0],ids[1],distance)); selectedIds.clear()
    }
    fun filletSelected(radius:Double) {
        val ids=selectedIds.toList(); require(ids.size==2){"FILLET requires two selected lines"}
        history.run(filletCommand(document,ids[0],ids[1],radius)); selectedIds.clear()
    }

    fun undo():Boolean { selectedIds.clear(); return history.undo() }
    fun redo():Boolean { selectedIds.clear(); return history.redo() }
    fun entityCount():Int=document.size()
    fun holeCount():Int=document.all().count { it.id.startsWith("HOLE:") }
    fun arcCount():Int=document.all().count { it is Arc }

    fun primitives():List<CleanCadPrimitive> = document.all().mapNotNull { e ->
        when(e) {
            is Line -> CleanCadPrimitive.Segment(e.a.x,e.a.y,e.b.x,e.b.y,e.id in selectedIds)
            is Circle -> if(e.id.startsWith("HOLE:")) CleanCadPrimitive.HoleShape(e.center.x,e.center.y,e.radius,e.id in selectedIds)
                else CleanCadPrimitive.CircleShape(e.center.x,e.center.y,e.radius,e.id in selectedIds)
            is Arc -> {
                val start=Math.toDegrees(atan2(e.start.y-e.center.y,e.start.x-e.center.x))
                val end=Math.toDegrees(atan2(e.end.y-e.center.y,e.end.x-e.center.x))
                var sweep=end-start
                if(e.clockwise){ while(sweep>=0.0)sweep-=360.0 } else { while(sweep<=0.0)sweep+=360.0 }
                CleanCadPrimitive.ArcShape(e.center.x,e.center.y,e.radius,start,sweep,e.id in selectedIds)
            }
            else -> null
        }
    }

    private fun distanceTo(e:Entity,x:Double,y:Double):Double = when(e) {
        is Line -> pointSegmentDistance(x,y,e.a.x,e.a.y,e.b.x,e.b.y)
        is Circle -> abs(hypot(x-e.center.x,y-e.center.y)-e.radius)
        is Arc -> abs(hypot(x-e.center.x,y-e.center.y)-e.radius)
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
