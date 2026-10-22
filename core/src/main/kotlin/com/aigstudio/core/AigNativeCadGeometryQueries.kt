package com.aigstudio.core

import kotlin.math.*

/** Native Studio CAD Entity bridge to analytic geometry; no UI shell, no
 * implicit generation of NC code or untested curved tool compensation.
 */
object AigNativeCadGeometryQueries {
    fun intersections(first:Entity,second:Entity):List<Vec2> {
        val k=AigAnalyticCadKernel
        fun line(e:Entity)=e as? Line
        fun circle(e:Entity)=e as? Circle
        fun arc(e:Entity)=e as? Arc
        fun spec(e:Arc):AigAnalyticCadKernel.ArcSpec {
            val from=atan2(e.start.y-e.center.y,e.start.x-e.center.x)
            val to=atan2(e.end.y-e.center.y,e.end.x-e.center.x)
            var sweep=to-from
            if(e.clockwise){while(sweep>=0)sweep-=2*PI}
            else{while(sweep<=0)sweep+=2*PI}
            return AigAnalyticCadKernel.ArcSpec(e.center,e.radius,from,sweep)
        }
        return when {
            line(first)!=null && line(second)!=null ->
                k.segmentSegment(line(first)!!.a,line(first)!!.b,
                    line(second)!!.a,line(second)!!.b)
            line(first)!=null && circle(second)!=null ->
                k.segmentCircle(line(first)!!.a,line(first)!!.b,
                    circle(second)!!.center,circle(second)!!.radius)
            circle(first)!=null && line(second)!=null ->
                k.segmentCircle(line(second)!!.a,line(second)!!.b,
                    circle(first)!!.center,circle(first)!!.radius)
            circle(first)!=null && circle(second)!=null ->
                k.circleCircle(circle(first)!!.center,circle(first)!!.radius,
                    circle(second)!!.center,circle(second)!!.radius)
            line(first)!=null && arc(second)!=null ->
                k.segmentArc(line(first)!!.a,line(first)!!.b,spec(arc(second)!!))
            arc(first)!=null && line(second)!=null ->
                k.segmentArc(line(second)!!.a,line(second)!!.b,spec(arc(first)!!))
            else->error("CAD_INTERSECTION_UNSUPPORTED_ENTITY_PAIR")
        }
    }
    fun offsetClosedLineContour(lines:List<Line>,distanceMm:Double):List<Vec2> {
        require(lines.size in 3..256){"CAD_INVALID_OFFSET_LINE_COUNT"}
        val unused=lines.toMutableList()
        val first=unused.removeAt(0)
        val p=mutableListOf(first.a,first.b)
        while(unused.isNotEmpty()){
            val at=unused.indexOfFirst{(it.a-p.last()).length()<=1e-8 ||
                (it.b-p.last()).length()<=1e-8}
            require(at>=0){"CAD_OFFSET_DISCONNECTED_LINES"}
            val e=unused.removeAt(at)
            p+=(if((e.a-p.last()).length()<=1e-8)e.b else e.a)
        }
        return AigAnalyticCadKernel.offsetClosedConvex(p,distanceMm)
    }
}
