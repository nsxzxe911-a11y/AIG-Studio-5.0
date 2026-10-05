package com.aigstudio.core

import java.util.UUID
import kotlin.math.*

enum class CamFeatureKind { OUTER, INNER, SLOT }
data class CamRecognizedFeature(val kind:CamFeatureKind,val entityIds:Set<EntityId>,val areaEstimateMm2:Double)

private object CadAdvancedGeometry {
    fun arcSweepRad(a:Arc):Double {
        fun angle(p:Vec2)=atan2(p.y-a.center.y,p.x-a.center.x)
        var d=angle(a.end)-angle(a.start)
        if(a.clockwise){ while(d>=0.0)d-=2.0*PI } else { while(d<=0.0)d+=2.0*PI }
        return d
    }
    fun endpoints(e:Entity):Pair<Vec2,Vec2>? = when(e){
        is Line -> e.a to e.b
        is Arc -> e.start to e.end
        is Circle -> null
    }
    fun sampled(e:Entity,forward:Boolean=true):List<Vec2> = when(e){
        is Line -> if(forward) listOf(e.a,e.b) else listOf(e.b,e.a)
        is Circle -> (0..48).map{i->val a=2.0*PI*i/48.0;Vec2(e.center.x+cos(a)*e.radius,e.center.y+sin(a)*e.radius)}
        is Arc -> {
            val sweep=arcSweepRad(e)
            val start=atan2(e.start.y-e.center.y,e.start.x-e.center.x)
            val n=max(8,ceil(abs(sweep)/(PI/18.0)).toInt())
            val pts=(0..n).map{i->val a=start+sweep*i/n;Vec2(e.center.x+cos(a)*e.radius,e.center.y+sin(a)*e.radius)}
            if(forward) pts else pts.asReversed()
        }
    }
    fun orderClosed(component:List<Entity>,tol:Double=CNC_RESOLUTION_MM):List<Vec2>? {
        if(component.size==1 && component[0] is Circle) return sampled(component[0])
        val remaining=component.toMutableList(); if(remaining.isEmpty())return null
        val first=remaining.removeAt(0); val ep=endpoints(first)?:return null
        val points=mutableListOf<Vec2>(); points+=sampled(first,true)
        var cursor=ep.second; val start=ep.first
        while(remaining.isNotEmpty()){
            val idx=remaining.indexOfFirst{e->endpoints(e)?.let{(a,b)->a.distanceTo(cursor)<=tol||b.distanceTo(cursor)<=tol}?:false}
            if(idx<0)return null
            val e=remaining.removeAt(idx); val pair=endpoints(e)!!; val forward=pair.first.distanceTo(cursor)<=tol
            val add=sampled(e,forward); points+=add.drop(1); cursor=if(forward) pair.second else pair.first
        }
        if(cursor.distanceTo(start)>tol)return null
        return points
    }
    fun areaFromPoints(points:List<Vec2>):Double {
        if(points.size<3)return 0.0
        var s=0.0
        for(i in points.indices){val a=points[i];val b=points[(i+1)%points.size];s+=a.x*b.y-b.x*a.y}
        return abs(s)*0.5
    }
    fun components(entities:List<Entity>,tol:Double=CNC_RESOLUTION_MM):List<List<Entity>>{
        val circles=entities.filterIsInstance<Circle>().map{listOf<Entity>(it)}
        val open=entities.filterNot{it is Circle}.toMutableList(); val groups=mutableListOf<List<Entity>>()
        while(open.isNotEmpty()){
            val group=mutableListOf(open.removeAt(0)); var changed=true
            while(changed){changed=false; val pts=group.flatMap{endpoints(it)?.let{p->listOf(p.first,p.second)}?:emptyList()}
                val it=open.iterator(); while(it.hasNext()){val e=it.next();val p=endpoints(e)?:continue;if(pts.any{x->x.distanceTo(p.first)<=tol||x.distanceTo(p.second)<=tol}){group+=e;it.remove();changed=true}}
            }
            groups+=group
        }
        return groups+circles
    }
}

object CadMeasurementEngine {
    fun length(line:Line)=line.length
    fun horizontal(line:Line)=abs(line.b.x-line.a.x)
    fun vertical(line:Line)=abs(line.b.y-line.a.y)
    fun radius(entity:Entity)=when(entity){is Circle->entity.radius;is Arc->entity.radius;else->error("RADIUS requires CIRCLE/ARC")}
    fun diameter(entity:Entity)=radius(entity)*2.0
    fun distance(a:Vec2,b:Vec2)=a.distanceTo(b)
    fun angleBetween(first:Line,second:Line):Double{
        val ax=first.b.x-first.a.x;val ay=first.b.y-first.a.y;val bx=second.b.x-second.a.x;val by=second.b.y-second.a.y
        val al=hypot(ax,ay);val bl=hypot(bx,by);require(al>=CNC_RESOLUTION_MM&&bl>=CNC_RESOLUTION_MM){"ANGLE requires non-degenerate lines"}
        return Math.toDegrees(acos(((ax*bx+ay*by)/(al*bl)).coerceIn(-1.0,1.0)))
    }
    fun perimeter(entities:List<Entity>):Double=entities.sumOf{e->when(e){is Line->e.length;is Circle->2.0*PI*e.radius;is Arc->abs(CadAdvancedGeometry.arcSweepRad(e))*e.radius}}
    fun area(entities:List<Entity>):Double=CadAdvancedGeometry.components(entities).sumOf{c->
        if(c.size==1&&c[0] is Circle) PI*(c[0] as Circle).radius.pow(2) else CadAdvancedGeometry.orderClosed(c)?.let(CadAdvancedGeometry::areaFromPoints)?:0.0
    }
}

object CadConstraintEngine {
    private fun unit(line:Line):Vec2 { val dx=line.b.x-line.a.x;val dy=line.b.y-line.a.y;val l=hypot(dx,dy);require(l>=CNC_RESOLUTION_MM){"Constraint reference line too short"};return Vec2(dx/l,dy/l) }
    private fun aligned(target:Line,u0:Vec2):Line { val len=target.length;require(len>=CNC_RESOLUTION_MM){"Constraint target line too short"};var u=u0;val td=Vec2(target.b.x-target.a.x,target.b.y-target.a.y);if(td.x*u.x+td.y*u.y<0)u=Vec2(-u.x,-u.y);return target.copy(b=Vec2(target.a.x+u.x*len,target.a.y+u.y*len)) }
    fun horizontal(line:Line)=line.copy(b=Vec2(line.b.x,line.a.y)).also{require(it.length>=CNC_RESOLUTION_MM){"HORIZONTAL collapses line"}}
    fun vertical(line:Line)=line.copy(b=Vec2(line.a.x,line.b.y)).also{require(it.length>=CNC_RESOLUTION_MM){"VERTICAL collapses line"}}
    fun parallel(reference:Line,target:Line)=aligned(target,unit(reference))
    fun perpendicular(reference:Line,target:Line):Line{val u=unit(reference);return aligned(target,Vec2(-u.y,u.x))}
    fun concentric(reference:Entity,target:Entity):Entity{
        val rc=when(reference){is Circle->reference.center;is Arc->reference.center;else->error("CONCENTRIC reference requires CIRCLE/ARC")}
        return when(target){is Circle->target.copy(center=rc);is Arc->{val d=Vec2(rc.x-target.center.x,rc.y-target.center.y);target.copy(center=rc,start=Vec2(target.start.x+d.x,target.start.y+d.y),end=Vec2(target.end.x+d.x,target.end.y+d.y))};else->error("CONCENTRIC target requires CIRCLE/ARC")}
    }
    fun tangentExternal(reference:Circle,target:Circle):Circle{
        val dx=target.center.x-reference.center.x;val dy=target.center.y-reference.center.y;val d=hypot(dx,dy);require(d>=CNC_RESOLUTION_MM){"TANGENT centers must differ"};val need=reference.radius+target.radius
        return target.copy(center=Vec2(reference.center.x+dx/d*need,reference.center.y+dy/d*need))
    }
    fun tangent(line:Line,circle:Circle):Line{
        val u=unit(line);val n=Vec2(-u.y,u.x);val signed=(circle.center.x-line.a.x)*n.x+(circle.center.y-line.a.y)*n.y;val desired=if(signed>=0) circle.radius else -circle.radius;val shift=signed-desired
        return line.copy(a=Vec2(line.a.x+n.x*shift,line.a.y+n.y*shift),b=Vec2(line.b.x+n.x*shift,line.b.y+n.y*shift))
    }
}

object CadDxfCodec {
    private fun f(v:Double)=java.math.BigDecimal.valueOf(v).stripTrailingZeros().toPlainString()
    private fun angle(center:Vec2,p:Vec2)=Math.toDegrees(atan2(p.y-center.y,p.x-center.x)).let{if(it<0)it+360.0 else it}
    fun exportAscii(entities:List<Entity>):String=buildString{
        append("0\nSECTION\n2\nHEADER\n9\n${'$'}INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n")
        entities.forEach{e->when(e){
            is Line->append("0\nLINE\n8\nAIG_CAD\n10\n${f(e.a.x)}\n20\n${f(e.a.y)}\n11\n${f(e.b.x)}\n21\n${f(e.b.y)}\n")
            is Circle->{val layer=if(e.id.startsWith("HOLE:"))"AIG_HOLE" else "AIG_CAD";append("0\nCIRCLE\n8\n$layer\n10\n${f(e.center.x)}\n20\n${f(e.center.y)}\n40\n${f(e.radius)}\n")}
            is Arc->{var a0=angle(e.center,e.start);var a1=angle(e.center,e.end);if(e.clockwise){val t=a0;a0=a1;a1=t};append("0\nARC\n8\nAIG_CAD\n10\n${f(e.center.x)}\n20\n${f(e.center.y)}\n40\n${f(e.radius)}\n50\n${f(a0)}\n51\n${f(a1)}\n")}
        }}
        append("0\nENDSEC\n0\nEOF\n")
    }
    fun importAscii(text:String):List<Entity>{
        val lines=text.replace("\r","").split('\n');require(lines.size>=2){"DXF empty"};val pairs=lines.chunked(2).filter{it.size==2}.map{it[0].trim() to it[1].trim()}
        val out=mutableListOf<Entity>();var i=0
        while(i<pairs.size){if(pairs[i].first!="0"||pairs[i].second !in setOf("LINE","CIRCLE","ARC")){i++;continue};val type=pairs[i].second;val data=mutableMapOf<String,String>();i++;while(i<pairs.size&&pairs[i].first!="0"){data[pairs[i].first]=pairs[i].second;i++}
            fun d(k:String)=data[k]?.toDoubleOrNull()?:error("DXF $type missing $k")
            when(type){
                "LINE"->out+=Line(a=Vec2(d("10"),d("20")),b=Vec2(d("11"),d("21")))
                "CIRCLE"->{val id=if(data["8"]=="AIG_HOLE") CadSemanticIdentity.newHoleId() else UUID.randomUUID().toString();out+=Circle(id=id,center=Vec2(d("10"),d("20")),radius=d("40"))}
                "ARC"->{val c=Vec2(d("10"),d("20"));val r=d("40");val a0=Math.toRadians(d("50"));val a1=Math.toRadians(d("51"));out+=Arc(center=c,radius=r,start=Vec2(c.x+cos(a0)*r,c.y+sin(a0)*r),end=Vec2(c.x+cos(a1)*r,c.y+sin(a1)*r),clockwise=false)}
            }
        }
        return out
    }
}

object CamFeatureRecognizer {
    private fun isSlot(c:List<Entity>):Boolean{
        if(c.size!=4||c.count{it is Line}!=2||c.count{it is Arc}!=2)return false
        val arcs=c.filterIsInstance<Arc>();if(abs(arcs[0].radius-arcs[1].radius)>CNC_RESOLUTION_MM)return false
        return arcs.all{abs(it.start.distanceTo(it.end)-2.0*it.radius)<=CNC_RESOLUTION_MM*2.0}
    }
    fun recognize(entities:List<Entity>):List<CamRecognizedFeature>{
        val components=CadAdvancedGeometry.components(entities).filter{c->CadProfileTools.analyze(c).closed}
        data class Raw(val c:List<Entity>,val area:Double,val slot:Boolean)
        val raw=components.map{c->Raw(c,CadMeasurementEngine.area(c),isSlot(c))}
        val nonSlot=raw.filterNot{it.slot};val outer=nonSlot.maxByOrNull{it.area}
        return raw.map{r->CamRecognizedFeature(when{r.slot->CamFeatureKind.SLOT;r===outer->CamFeatureKind.OUTER;else->CamFeatureKind.INNER},r.c.map{it.id}.toSet(),r.area)}
    }
}
