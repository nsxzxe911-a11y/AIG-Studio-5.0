package com.aigstudio.core

fun main(){
    val env=RuntimeHandoffEnvelope(
        projectId="P1",revision=7,contentDigest="a".repeat(64),requestedSurface="6AX",axisMode="6AX",
        x=1.0,y=2.0,z=3.0,a=10.0,b=20.0,c=30.0,
        controllerVersion="444.0.0",controllerSha="b".repeat(40),runtimeVersion="433.0.0",runtimeSha="c".repeat(40)
    )
    check(env.normalizedSurface()=="6AX")
    check(env.findings().isEmpty())
    check(env.localProjectRemainsUsable())
    val review=env.copy(c=400.0,contentDigest="bad")
    check("ROTARY_RANGE_REVIEW" in review.findings())
    check("CONTENT_DIGEST_FORMAT" in review.findings())
    check(review.localProjectRemainsUsable())
    println("RUNTIME_HANDOFF_ENVELOPE_PASS|AIGII_TO_AIGCNC|XYZABC|DIGEST|NO_GLOBAL_LOCK")
}
