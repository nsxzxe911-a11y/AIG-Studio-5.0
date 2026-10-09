import com.aigstudio.production.runtime.CleanAiContinuitySession
import java.nio.file.Files

fun main() {
    val root = Files.createTempDirectory("aig-ai-continuity").toFile()
    val s = CleanAiContinuitySession(root)
    val cp = s.saveUpdateCheckpoint("pkg-demo", 4096L, 8192L)
    check(cp.resumeOffset == 4096L)
    check(cp.packageId == "pkg-demo")
    val cpReloaded = CleanAiContinuitySession(root).loadUpdateCheckpoint() ?: error("update checkpoint missing")
    check(cpReloaded.resumeOffset == 4096L && cpReloaded.totalBytes == 8192L)

    val saved = s.saveDepartmentCheckpoint("DOWNLOAD", "390.0.0", 4, 10, "NETWORK_DISCONNECT")
    check(saved.department == "AI")
    val loaded = CleanAiContinuitySession(root).loadDepartmentCheckpoint() ?: error("checkpoint missing")
    check(loaded.phase == "DOWNLOAD")
    check(loaded.completedUnits == 4 && loaded.totalUnits == 10)
    check(loaded.lastError == "NETWORK_DISCONNECT")

    val net = s.networkStatus(3)
    check(net.circuitOpen)
    check(!net.runtimeBlocked)
    check(net.retryDelayMs > 0L)

    val bad = runCatching { s.saveUpdateCheckpoint("pkg-demo", 9000L, 8192L) }
    check(bad.isFailure)
    println("CLEAN_AI_CONTINUITY_PASS|AIG_CNC|CHECKPOINT_PERSIST|RESUME_OFFSET|NETWORK_NONBLOCKING|CIRCUIT_BREAKER")
}
