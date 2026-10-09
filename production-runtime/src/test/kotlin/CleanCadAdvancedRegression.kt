import com.aigstudio.production.runtime.CleanCadPrimitive
import com.aigstudio.production.runtime.CleanCadSession
import kotlin.math.abs

private fun segs(s:CleanCadSession)=s.primitives().filterIsInstance<CleanCadPrimitive.Segment>()

fun main(){
    run {
        val s=CleanCadSession(); s.addLine(-10.0,0.0,10.0,0.0); s.addLine(0.0,-10.0,0.0,10.0)
        check(s.selectNearest(-5.0,0.0)); check(s.selectNearest(0.0,5.0,true)); check(s.selectedCount()==2)
        s.trimSelected(); check(s.entityCount()==2); check(segs(s).any{abs(it.bx)<=0.001 || abs(it.ax)<=0.001})
    }
    run {
        val s=CleanCadSession(); s.addLine(-10.0,0.0,-2.0,0.0); s.addLine(0.0,-10.0,0.0,10.0)
        check(s.selectNearest(-5.0,0.0)); check(s.selectNearest(0.0,5.0,true)); s.extendSelected()
        check(segs(s).any{abs(it.bx)<=0.001 || abs(it.ax)<=0.001})
    }
    run {
        val s=CleanCadSession(); s.addLine(0.0,0.0,10.0,0.0); check(s.selectNearest(5.0,0.0)); s.offsetSelected(5.0)
        check(s.entityCount()==2); check(segs(s).any{abs(it.ay-5.0)<=0.001 && abs(it.by-5.0)<=0.001})
    }
    run {
        val s=CleanCadSession(); s.addLine(0.0,0.0,10.0,0.0); check(s.selectNearest(5.0,0.0)); s.arraySelected(3,10.0,0.0)
        check(s.entityCount()==3)
    }
    println("CLEAN_CAD_ADVANCED_PASS|AIG_CNC|SELECT|TRIM|EXTEND|OFFSET|ARRAY")
}
