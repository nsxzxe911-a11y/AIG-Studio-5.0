import com.aigstudio.production.runtime.CleanCadSession

fun main(){
    val hole=CleanCadSession()
    hole.addHole(0.0,0.0,10.0)
    check(hole.holeCount()==1){"HOLE semantic missing"}

    val ch=CleanCadSession()
    ch.addLine(0.0,0.0,30.0,0.0); ch.addLine(0.0,0.0,0.0,30.0)
    check(ch.selectNearest(20.0,0.0)); check(ch.selectNearest(0.0,20.0,true))
    ch.chamferSelected(5.0)
    check(ch.entityCount()==3 && ch.arcCount()==0){"CHAMFER bridge geometry invalid"}

    val fi=CleanCadSession()
    fi.addLine(0.0,0.0,30.0,0.0); fi.addLine(0.0,0.0,0.0,30.0)
    check(fi.selectNearest(20.0,0.0)); check(fi.selectNearest(0.0,20.0,true))
    fi.filletSelected(5.0)
    check(fi.entityCount()==3 && fi.arcCount()==1){"FILLET arc missing"}
    println("CLEAN_CAD_CORNER_PASS|AIG_CNC|HOLE_SEMANTIC|CHAMFER_BRIDGE|FILLET_ARC")
}
