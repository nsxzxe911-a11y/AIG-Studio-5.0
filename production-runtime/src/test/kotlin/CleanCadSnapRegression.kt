import com.aigstudio.production.runtime.CleanCadSession
import com.aigstudio.production.runtime.CleanCadSnapMode
import kotlin.math.abs
import kotlin.math.hypot

private fun near(a:Double,b:Double,eps:Double=1e-6)=abs(a-b)<=eps
fun main(){
    val s=CleanCadSession()
    s.addLine(0.0,0.0,10.0,0.0)
    s.addLine(25.0,30.0,35.0,30.0); s.addLine(30.0,25.0,30.0,35.0)
    s.addCircle(50.0,50.0,5.0)
    val ep=s.snapPoint(.2,.1,.5,CleanCadSnapMode.ENDPOINT)!!; check(near(ep.x,0.0)&&near(ep.y,0.0))
    val mid=s.snapPoint(5.1,.1,.5,CleanCadSnapMode.MIDPOINT)!!; check(near(mid.x,5.0)&&near(mid.y,0.0))
    val center=s.snapPoint(50.2,49.9,.5,CleanCadSnapMode.CENTER)!!; check(near(center.x,50.0)&&near(center.y,50.0))
    val inter=s.snapPoint(30.2,30.1,.5,CleanCadSnapMode.INTERSECTION)!!; check(near(inter.x,30.0)&&near(inter.y,30.0))
    val h=s.snapPoint(8.0,.2,.5,CleanCadSnapMode.HORIZONTAL,0.0,0.0)!!; check(near(h.x,8.0)&&near(h.y,0.0))
    val v=s.snapPoint(.2,8.0,.5,CleanCadSnapMode.VERTICAL,0.0,0.0)!!; check(near(v.x,0.0)&&near(v.y,8.0))
    val t=s.snapPoint(55.1,50.0,2.0,CleanCadSnapMode.TANGENT)!!; check(near(hypot(t.x-50.0,t.y-50.0),5.0,1e-5))
    println("CLEAN_CAD_SNAP_PASS|AIG_CNC|ENDPOINT|MIDPOINT|CENTER|INTERSECTION|HORIZONTAL|VERTICAL|TANGENT")
}
