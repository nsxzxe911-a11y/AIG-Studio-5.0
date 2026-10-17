package com.aigstudio.core

fun main(){
    val valid="G90 G54\nM98 P4 L2\nM30"
    val findings=NcRuntimeInterlock.findings(valid)
    check(findings.none{it.code=="UNSUPPORTED_NC_ADDRESS_L"})
    check(findings.none{it.code=="M98_FORMAT_L_NONPOSITIVE"})

    val zero=NcRuntimeInterlock.findings("M98 P4 L0")
    check(zero.any{it.code=="M98_FORMAT_L_NONPOSITIVE"})

    val fractional=NcRuntimeInterlock.findings("M98 P4 L2.5")
    check(fractional.any{it.code=="M98_FORMAT_L_NOT_INTEGER"})

    println("FANUC_M98_REPEAT_PASS|P_SUBPROGRAM|L_REPEAT|POSITIVE_INTEGER|FAIL_CLOSED")
}
