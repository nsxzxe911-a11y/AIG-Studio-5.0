import com.aigstudio.production.runtime.CleanCamSession

fun main() {
    val s=CleanCamSession()
    check(s.mode()=="AUTO")
    s.startManual()
    check(s.mode()=="MANUAL")
    check(s.points().size==2)
    s.setSafeZ(8.0)
    check(s.safeZ()==8.0)
    s.addCutPoint(10.0,5.0,-2.0)
    s.addRapidPoint(20.0,5.0)
    check(s.points().any{!it.rapid})
    check(s.points().any{it.rapid && it.z>=8.0})
    val before=s.points().size
    s.insertAvoidance(1,25.0,15.0,-2.0)
    check(s.points().size==before+3)
    s.replacePoint(2,30.0,12.0,8.0,true)
    check(s.points()[2].x==30.0)
    val side=s.side(); s.toggleSide(); check(s.side()!=side)
    val dir=s.direction(); s.toggleDirection(); check(s.direction()!=dir)
    s.useAuto(); check(s.mode()=="AUTO")
    println("CLEAN_CAM_RUNTIME_PASS|AIG_CNC|AUTO_MANUAL|SAFE_Z|G0_G1|SIDE_DIR|EDIT|AVOIDANCE")
}
