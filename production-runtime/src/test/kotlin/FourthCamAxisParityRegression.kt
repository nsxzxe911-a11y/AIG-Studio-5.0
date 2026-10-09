import com.aigstudio.production.runtime.CleanCamSession
import com.aigstudio.runtime4.contract.CamMotionKind
import com.aigstudio.runtime4.contract.CamPointSnapshot

fun main() {
    val contract = CamPointSnapshot(1.0,2.0,-3.0,15.0,-20.0,35.0,CamMotionKind.G1)
    check(contract.a == 15.0 && contract.b == -20.0 && contract.c == 35.0)

    val s = CleanCamSession()
    s.startManual()
    s.replacePoint(0, 1.0, 2.0, 8.0, true, 15.0, -20.0, 35.0)
    var p = s.points()[0]
    check(p.axisA == 15.0 && p.axisB == -20.0 && p.axisC == 35.0)

    s.replacePoint(0, 1.0, 2.0, 8.0, true, 360.0, -360.0, 0.0)
    p = s.points()[0]
    check(p.axisA == 360.0 && p.axisB == -360.0 && p.axisC == 0.0)

    listOf(360.001, Double.NaN, Double.POSITIVE_INFINITY).forEach { bad ->
        check(runCatching { s.replacePoint(0,1.0,2.0,8.0,true,bad,0.0,0.0) }.isFailure)
    }

    s.replacePoint(1, 5.0, 6.0, -2.0, false, 10.0, 20.0, 30.0)
    s.insertAvoidance(1, 25.0, 15.0, -2.0)
    val inserted = s.points().subList(2,5)
    check(inserted.all { it.axisA == 10.0 && it.axisB == 20.0 && it.axisC == 30.0 })
    println("FOURTH_CAM_AXIS_PARITY_PASS|AIG_CNC|XYZABC|BOUNDARY|AVOIDANCE")
}