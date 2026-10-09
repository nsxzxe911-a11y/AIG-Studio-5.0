import com.aigstudio.production.runtime.CleanAiSession

fun main() {
    val s=CleanAiSession()
    val opened=s.openMain()
    val immutable=opened.immutableMainDigest
    require(immutable.isNotBlank())
    s.stage("G90 G54\nG999 X1.\nM30")
    val bad=s.verify()
    require(!bad.verified && bad.issueCount>0)
    require(runCatching{s.promote()}.isFailure)
    require(s.snapshot().immutableMainDigest==immutable)
    s.stage("G90 G54\nG0 X0. Y0.\nS2300 M3\nG43 Z30. H1 M8\nG1 Z-10. F180.\nG80\nM30")
    val good=s.verify()
    require(good.verified && good.issueCount==0)
    val promoted=s.promote()
    require(promoted.currentMain.contains("F180"))
    require(promoted.immutableMainDigest==immutable)
    println("CLEAN_AI_RUNTIME_PASS|AIG_CNC|IMMUTABLE_MAIN|WORKING_COPY|VERIFY_BLOCK|PROMOTE_VERIFIED|NO_FAKE_AI")
}
