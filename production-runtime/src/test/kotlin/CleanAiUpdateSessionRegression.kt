import com.aigstudio.core.AiPackageArtifact
import com.aigstudio.core.VerifiedWorkingCopy
import com.aigstudio.production.runtime.CleanAiUpdateSession
import java.io.File
import java.nio.file.Files

fun main() {
    val s=CleanAiUpdateSession("388.0.0")
    val health=s.health()
    require(health.packageHealthy && health.packageCount>=20)
    val forward=s.evaluate("388.0.0","388.0.0","389.0.0",false,false)
    require(forward.forwardAllowed && !forward.promotionReady)
    val downgrade=s.evaluate("388.0.0","388.0.0","387.0.0",true,true)
    require(!downgrade.forwardAllowed && !downgrade.promotionReady)
    val root=Files.createTempDirectory("aig-ai-update").toFile()
    val source=File(root,"candidate.bin").apply{writeText("verified-update")}
    val artifact=AiPackageArtifact("ai-runtime","389.0.0",VerifiedWorkingCopy.sha256(source),"file://local")
    val staged=s.stageVerified(source,File(root,"work"),artifact)
    val target=File(root,"installed/ai-runtime.bin")
    require(runCatching{s.promoteVerified(staged,target,"388.0.0","389.0.0",false,true)}.isFailure)
    val promoted=s.promoteVerified(staged,target,"388.0.0","389.0.0",true,true)
    require(promoted.readText()=="verified-update")
    root.deleteRecursively()
    println("CLEAN_AI_UPDATE_PASS|AIG_CNC|PACKAGE_HEALTH|FORWARD_ONLY|SHA_STAGE|GATE_PROMOTE|NO_DOWNGRADE")
}
