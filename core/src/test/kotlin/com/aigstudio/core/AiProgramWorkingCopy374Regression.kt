package com.aigstudio.core

fun main(){
    val main="G90\nG54\nG0 X0. Y0.\nM30"
    val vault=AiProgramWorkingCopyVault()
    val opened=vault.open(main)
    check(opened.status==AiProgramCopyStatus.WORKING)
    val originalDigest=opened.immutableMainDigest

    val bad="G90\nG999 X0.\nM30"
    vault.stage(bad)
    check(vault.immutableMain()==main)
    val badResult=vault.verify{ program -> AiProgramNcVerifier.verify(program,CncControllerProfile.FANUC) }
    check(!badResult.ok)
    check(vault.snapshot().status==AiProgramCopyStatus.WORKING)
    check(runCatching{vault.promote()}.isFailure)
    check(vault.snapshot().immutableMainDigest==originalDigest)

    val good="G90\nG54\nG0 X10. Y5.\nM30"
    vault.stage(good)
    val goodResult=vault.verify{ program -> AiProgramNcVerifier.verify(program,CncControllerProfile.FANUC) }
    check(goodResult.ok)
    check(vault.snapshot().status==AiProgramCopyStatus.VERIFIED)
    check(vault.immutableMain()==main)
    val promoted=vault.promote()
    check(promoted==good)
    check(vault.immutableMain()==main)
    check(vault.snapshot().immutableMainDigest==originalDigest)
    println("AIGCNC_374_AI_WORKING_COPY_PASS|IMMUTABLE_MAIN|STAGE|VERIFY|EXPLICIT_PROMOTE|NC_AUTHORITY")
}
