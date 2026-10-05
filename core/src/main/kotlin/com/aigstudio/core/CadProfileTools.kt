package com.aigstudio.core

import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin

data class CadContourReport(
    val closed:Boolean,
    val componentCount:Int,
    val openEnds:Int,
    val branchNodes:Int
) {
    fun statusLabel():String = when {
        closed -> "CLOSED • components=$componentCount • CAM contour ready"
        branchNodes>0 -> "OPEN/BRANCHED • openEnds=$openEnds • branches=$branchNodes"
        else -> "OPEN • openEnds=$openEnds • components=$componentCount"
    }
}

object CadProfileTools {
    private data class EndpointRef(val first:Boolean,val atStart:Boolean,val point:Vec2)

    private fun requireFinite(point:Vec2,label:String) {
        require(point.x.isFinite() && point.y.isFinite()) { "$label point must be finite" }
    }

    private fun segmentLength(a:Vec2,b:Vec2):Double = hypot(b.x-a.x,b.y-a.y)

    fun polyline(points:List<Vec2>,closed:Boolean=false):List<Line> {
        require(points.size>=2) { "POLYLINE requires at least two points" }
        if(closed) require(points.size>=3) { "Closed POLYLINE requires at least three points" }
        points.forEachIndexed { index,p -> requireFinite(p,"POLYLINE[$index]") }
        val pairs=buildList {
            for(i in 0 until points.lastIndex) add(points[i] to points[i+1])
            if(closed) add(points.last() to points.first())
        }
        require(pairs.all { (a,b) -> segmentLength(a,b)>=CNC_RESOLUTION_MM }) {
            "POLYLINE segment must be >= 0.001 mm"
        }
        return pairs.map { (a,b) -> Line(a=a,b=b) }
    }

    fun slot(center:Vec2,lengthMm:Double,widthMm:Double,angleDeg:Double=0.0):List<Entity> {
        requireFinite(center,"SLOT center")
        require(lengthMm.isFinite() && widthMm.isFinite() && angleDeg.isFinite()) { "SLOT values must be finite" }
        require(widthMm>=2.0*CNC_RESOLUTION_MM) { "SLOT width must be >= 0.002 mm" }
        require(lengthMm>=widthMm+CNC_RESOLUTION_MM) { "SLOT length must exceed width by at least 0.001 mm" }
        val radius=widthMm/2.0
        val straight=lengthMm-widthMm
        val a=Math.toRadians(angleDeg)
        val ux=cos(a); val uy=sin(a)
        val nx=-uy; val ny=ux
        val c1=Vec2(center.x-ux*straight/2.0,center.y-uy*straight/2.0)
        val c2=Vec2(center.x+ux*straight/2.0,center.y+uy*straight/2.0)
        val leftTop=Vec2(c1.x+nx*radius,c1.y+ny*radius)
        val leftBottom=Vec2(c1.x-nx*radius,c1.y-ny*radius)
        val rightTop=Vec2(c2.x+nx*radius,c2.y+ny*radius)
        val rightBottom=Vec2(c2.x-nx*radius,c2.y-ny*radius)
        return listOf(
            Line(a=leftTop,b=rightTop),
            Arc(center=c2,radius=radius,start=rightTop,end=rightBottom,clockwise=true),
            Line(a=rightBottom,b=leftBottom),
            Arc(center=c1,radius=radius,start=leftBottom,end=leftTop,clockwise=true)
        )
    }

    fun analyze(entities:List<Entity>,tolerance:Double=CNC_RESOLUTION_MM):CadContourReport {
        require(tolerance.isFinite() && tolerance in EPS..CNC_RESOLUTION_MM) {
            "Contour tolerance must be > 0 and <= 0.001 mm"
        }
        if(entities.isEmpty()) return CadContourReport(false,0,0,0)
        val nodes=mutableListOf<Vec2>()
        val edges=mutableListOf<Pair<Int,Int>>()
        var closedPrimitiveComponents=0

        fun nodeFor(p:Vec2):Int {
            val existing=nodes.indexOfFirst { it.distanceTo(p)<=tolerance }
            if(existing>=0) return existing
            nodes+=p
            return nodes.lastIndex
        }

        entities.forEach { entity ->
            when(entity) {
                is Line -> edges+=nodeFor(entity.a) to nodeFor(entity.b)
                is Arc -> edges+=nodeFor(entity.start) to nodeFor(entity.end)
                is Circle -> closedPrimitiveComponents++
            }
        }

        val degree=IntArray(nodes.size)
        val adjacency=Array(nodes.size){linkedSetOf<Int>()}
        edges.forEach { (a,b) ->
            degree[a]++; degree[b]++
            adjacency[a]+=b; adjacency[b]+=a
        }
        val openEnds=degree.count { it==1 }
        val branchNodes=degree.count { it>2 }

        var graphComponents=0
        val seen=BooleanArray(nodes.size)
        for(i in nodes.indices) {
            if(seen[i] || degree[i]==0) continue
            graphComponents++
            val queue=ArrayDeque<Int>()
            queue.add(i); seen[i]=true
            while(queue.isNotEmpty()) {
                val n=queue.removeFirst()
                adjacency[n].forEach { next ->
                    if(!seen[next]) { seen[next]=true; queue.add(next) }
                }
            }
        }
        val componentCount=graphComponents+closedPrimitiveComponents
        val allEndpointDegreesValid=degree.all { it==0 || it==2 }
        val closed=componentCount>0 && openEnds==0 && branchNodes==0 && allEndpointDegreesValid
        return CadContourReport(closed,componentCount,openEnds,branchNodes)
    }

    fun join(first:Line,second:Line,tolerance:Double=CNC_RESOLUTION_MM):Pair<Line,Line> {
        require(tolerance.isFinite() && tolerance in EPS..CNC_RESOLUTION_MM) {
            "JOIN tolerance must be > 0 and <= 0.001 mm"
        }
        val refs=listOf(
            EndpointRef(true,true,first.a),EndpointRef(true,false,first.b),
            EndpointRef(false,true,second.a),EndpointRef(false,false,second.b)
        )
        val candidates=refs.filter{it.first}.flatMap { a -> refs.filter{!it.first}.map { b -> Triple(a,b,a.point.distanceTo(b.point)) } }
        val best=candidates.minByOrNull { it.third } ?: error("JOIN endpoints unavailable")
        require(best.third<=tolerance) { "JOIN blocked: endpoint gap exceeds 0.001 mm" }
        val mid=Vec2((best.first.point.x+best.second.point.x)/2.0,(best.first.point.y+best.second.point.y)/2.0)
        val a=if(best.first.atStart) first.copy(a=mid) else first.copy(b=mid)
        val b=if(best.second.atStart) second.copy(a=mid) else second.copy(b=mid)
        require(a.length>=CNC_RESOLUTION_MM && b.length>=CNC_RESOLUTION_MM) { "JOIN would create degenerate line" }
        return a to b
    }

    fun breakLine(line:Line,distanceFromStartMm:Double):Pair<Line,Line> {
        require(distanceFromStartMm.isFinite()) { "BREAK distance must be finite" }
        val length=line.length
        require(length>=3.0*CNC_RESOLUTION_MM) { "BREAK line is too short" }
        require(distanceFromStartMm>=CNC_RESOLUTION_MM && length-distanceFromStartMm>=CNC_RESOLUTION_MM) {
            "BREAK point must remain at least 0.001 mm from both endpoints"
        }
        val t=distanceFromStartMm/length
        val split=Vec2(
            line.a.x+(line.b.x-line.a.x)*t,
            line.a.y+(line.b.y-line.a.y)*t
        )
        return line.copy(b=split) to Line(a=split,b=line.b)
    }
}
