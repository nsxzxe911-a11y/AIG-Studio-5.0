package com.aigstudio.core

import kotlin.math.abs
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min

/**
 * Exact-in-source contour topology sanity gate for CAD → CAM recognition.
 * Native CAD entities remain authoritative; this checks the sampled CLOSED
 * 2D path only, not G41/42 clearance or 3D machining collision.
 */
object CadClosedContourTopology {
    private const val EPS_MM=0.001
    private const val MAX_SEGMENTS=512

    data class Ring(val points:List<Vec2>,val areaMm2:Double) {
        val minX=points.minOf{it.x}
        val maxX=points.maxOf{it.x}
        val minY=points.minOf{it.y}
        val maxY=points.maxOf{it.y}
    }

    private fun distance(a:Vec2,b:Vec2)=hypot(a.x-b.x,a.y-b.y)
    private fun cross(a:Vec2,b:Vec2,c:Vec2):Double =
        (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
    private fun onSegment(a:Vec2,b:Vec2,p:Vec2):Boolean{
        val length=distance(a,b)
        if(length<EPS_MM)return false
        val perpendicular=abs(cross(a,b,p))/length
        val projected=(p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y)
        return perpendicular<=EPS_MM &&
            projected>=-EPS_MM*length && projected<=length*length+EPS_MM*length
    }
    private fun touches(a:Vec2,b:Vec2,c:Vec2,d:Vec2):Boolean{
        if(max(a.x,b.x)+EPS_MM<min(c.x,d.x) ||
           max(c.x,d.x)+EPS_MM<min(a.x,b.x) ||
           max(a.y,b.y)+EPS_MM<min(c.y,d.y) ||
           max(c.y,d.y)+EPS_MM<min(a.y,b.y))return false
        if(onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b))
            return true
        val ac=cross(a,b,c);val ad=cross(a,b,d)
        val ca=cross(c,d,a);val cb=cross(c,d,b)
        return ((ac>0&&ad<0)||(ac<0&&ad>0)) &&
               ((ca>0&&cb<0)||(ca<0&&cb>0))
    }

    /** Null is a BLOCKED contour, never an approved toolpath. */
    fun inspect(sampled:List<Vec2>):Ring? {
        if(sampled.size !in 4..MAX_SEGMENTS+1)return null
        if(sampled.any{!it.x.isFinite()||!it.y.isFinite()||
            abs(it.x)>1000000||abs(it.y)>1000000})return null
        if(distance(sampled.first(),sampled.last())>EPS_MM)return null
        val p=sampled.dropLast(1)
        if(p.size<3||p.indices.any{i->distance(p[i],p[(i+1)%p.size])<EPS_MM})
            return null
        val n=p.size
        // Reject bow-ties, duplicate edges, overlaps and zero-width
        // crossings; adjacent edges legitimately meet at a single corner.
        for(i in 0 until n) for(j in i+1 until n){
            if(j==i+1||(i==0&&j==n-1))continue
            if(touches(p[i],p[(i+1)%n],p[j],p[(j+1)%n]))return null
        }
        var twice=0.0
        for(i in 0 until n){
            val a=p[i];val b=p[(i+1)%n]
            twice+=a.x*b.y-b.x*a.y
        }
        val area=abs(twice)*0.5
        if(!area.isFinite()||area<EPS_MM*EPS_MM)return null
        return Ring(p,area)
    }

    private fun strictlyInside(p:Vec2,ring:Ring):Boolean {
        if(p.x<=ring.minX+EPS_MM||p.x>=ring.maxX-EPS_MM||
            p.y<=ring.minY+EPS_MM||p.y>=ring.maxY-EPS_MM)return false
        var odd=false
        for(i in ring.points.indices){
            val a=ring.points[i];val b=ring.points[(i+1)%ring.points.size]
            if(onSegment(a,b,p))return false
            if((a.y>p.y)!=(b.y>p.y)){
                val crossing=a.x+(p.y-a.y)*(b.x-a.x)/(b.y-a.y)
                if(crossing>p.x)odd=!odd
            }
        }
        return odd
    }

    fun edgesTouch(a:Ring,b:Ring):Boolean {
        if(a.maxX+EPS_MM<b.minX||b.maxX+EPS_MM<a.minX||
           a.maxY+EPS_MM<b.minY||b.maxY+EPS_MM<a.minY)return false
        for(i in a.points.indices)for(j in b.points.indices)
            if(touches(a.points[i],a.points[(i+1)%a.points.size],
                       b.points[j],b.points[(j+1)%b.points.size]))return true
        return false
    }

    fun strictlyContains(outer:Ring,inner:Ring):Boolean{
        if(outer.areaMm2<=inner.areaMm2 ||
            outer.minX+EPS_MM>=inner.minX||
            outer.minY+EPS_MM>=inner.minY||
            outer.maxX-EPS_MM<=inner.maxX||
            outer.maxY-EPS_MM<=inner.maxY ||
            edgesTouch(outer,inner))return false
        return inner.points.all{strictlyInside(it,outer)}
    }

    fun nestingDepth(target:Ring,all:List<Ring>):Int{
        require(all.none{it!==target && edgesTouch(it,target)}){
            "Intersecting or touching closed CAD profiles cannot be assigned a CAM feature"
        }
        return all.count{it!==target&&strictlyContains(it,target)}
    }
}
