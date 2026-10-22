package ${x.pkg}

import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.util.Locale
import kotlin.math.abs
import kotlin.math.hypot
import kotlin.math.max

/** AIG cross-product scene protocol: exact, SHA-checked, visual-only G0/G1
 * tool-center animation. CNC core owns geometry and safety; FastModel only
 * draws the result. This never imports commands or certifies a machine.
 */
data class AigReadOnlyMotionPoint(
    val x:Double,val y:Double,val z:Double,
    val a:Double=0.0,val b:Double=0.0,val c:Double=0.0,
    val rapid:Boolean=false
)

object AigReadOnlyMotionPreview {
    const val SCHEMA="AIG_READONLY_MOTION_PREVIEW_V1"
    const val SOURCE_DOMAIN="CNC_CAM_SIM"
    const val REPRESENTATION="CNC_TOOL_CENTER_PREVIEW"
    const val HEADER="tSeconds,xMm,yMm,zMm,aDeg,bDeg,cDeg,rapid"
    const val MACHINE_EXECUTION_ALLOWED=false
    const val HUMAN_RIGGED_ANIMATION=false
    const val KINEMATICS_CERTIFIED=false
    private val axes=setOf("3AX","4AX","5AX","6AX")
    private fun fixed(value:Double,n:Int):String=String.format(Locale.US,"%."+n+"f",value)
    private fun sha256(value:String)=MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray(StandardCharsets.UTF_8))
        .joinToString("") { "%02x".format(it.toInt() and 255) }
    private fun jsonString(value:String):String =
        "\"" + value.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n") + "\""

    fun export(
        points:List<AigReadOnlyMotionPoint>,
        axisMode:String,
        cuttingFeedMmMin:Double,
        rapidRateMmMin:Double=3000.0
    ):String {
        require(axisMode in axes) { "Unknown preview axis mode" }
        require(points.size in 2..4000) { "A real bounded motion path is required" }
        require(cuttingFeedMmMin.isFinite() && cuttingFeedMmMin in 0.001..100000.0)
        require(rapidRateMmMin.isFinite() && rapidRateMmMin in 0.001..100000.0)
        points.forEach { p->
            require(listOf(p.x,p.y,p.z,p.a,p.b,p.c).all{it.isFinite() && abs(it)<=1000000.0}){
                "Invalid preview coordinate"
            }
            require(listOf(p.a,p.b,p.c).all{abs(it)<=360.0}){"Unverified rotary preview range"}
            require(axisMode!="3AX" || (p.a==0.0 && p.b==0.0 && p.c==0.0))
            require(axisMode!="4AX" || (p.b==0.0 && p.c==0.0))
            require(axisMode!="5AX" || p.c==0.0) { "C axis preview requires 6AX" }
        }
        var t=0.0
        val lines=mutableListOf(HEADER)
        points.forEachIndexed{index,p->
            if(index>0){
                val q=points[index-1]
                val delta=hypot(hypot(p.x-q.x,p.y-q.y),p.z-q.z)
                val feed=if(p.rapid)rapidRateMmMin else cuttingFeedMmMin
                t+=max(0.001,delta*60.0/feed)
            }
            require(t<=86400.0){"Excessive scene preview duration"}
            val fields=listOf(fixed(t,4),fixed(p.x,3),fixed(p.y,3),fixed(p.z,3),
                fixed(p.a,3),fixed(p.b,3),fixed(p.c,3),if(p.rapid)"1" else "0")
            lines+=fields.joinToString(",")
        }
        val data=lines.joinToString("\n")
        val hash=sha256(data)
        return """{"schema":"$SCHEMA","sourceDomain":"$SOURCE_DOMAIN","representation":"$REPRESENTATION","axisMode":"$axisMode","positionUnit":"mm","angleUnit":"deg","timeUnit":"s","interpolation":"LINEAR_TOOL_CENTER_ONLY","sourceMotion":"G0_G1_ONLY","pointCount":${points.size},"previewOnly":true,"machineExecutionAllowed":false,"physicalKinematicsCertified":false,"numericalMaterialRemovalCertified":false,"humanRiggedAnimation":false,"sha256":"$hash","data":${jsonString(data)}}"""
    }
    /** Arc moves remain blocked until physically correct arc interpolation
     * exists; rendering an unverified chord as the real cut is unacceptable.
     */
    fun fromCam(cam:CamModel,axisMode:String="3AX"):String {
        require(cam.toolpaths.all { path ->
            path.moves.firstOrNull()?.rapid==true && path.moves.none{it is ArcFeed}
        }){"Preview only accepts verified G0/G1 paths starting with a safe rapid"}
        val moves=cam.toolpaths.flatMap{it.moves}
        val points=moves.map {
            AigReadOnlyMotionPoint(it.to.x,it.to.y,it.z,it.axisA,it.axisB,it.axisC,it.rapid)
        }
        return export(points,axisMode,cam.settings.feedMmMin)
    }

}
