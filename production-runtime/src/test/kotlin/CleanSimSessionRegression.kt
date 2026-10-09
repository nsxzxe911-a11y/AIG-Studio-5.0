import com.aigstudio.production.runtime.CleanCamSession
import com.aigstudio.production.runtime.CleanSimSession

fun main() {
    val cam=CleanCamSession()
    cam.startManual()
    cam.setSafeZ(8.0)
    cam.addCutPoint(0.0,0.0,-2.0)
    cam.addCutPoint(30.0,0.0,-2.0)
    cam.addCutPoint(30.0,20.0,-3.0)
    val result=CleanSimSession(cam).run()
    check(result.removedCells>0)
    check(result.minDepthMm<=-2.0)
    check(result.removedVolumeMm3>0.0)
    println("CLEAN_SIM_RUNTIME_PASS|AIG_CNC|TRUE_MATERIAL_REMOVAL|CELLS=${result.removedCells}|MIN=${result.minDepthMm}|VOL=${result.removedVolumeMm3}")
}
