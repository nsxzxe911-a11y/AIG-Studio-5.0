package com.aigstudio.core

fun main(){
    val valid="G90 G54\nM98 P4 L2\nM30"
    check(StudioFanucProgramCompatibility.findings(valid).isEmpty())
    val legacy=StudioFanucProgramCompatibility.legacyProgram(valid)
    check("L2" !in legacy)
    check("M98 P4" in legacy)
    check(NcRuntimeInterlock.findings(legacy).none{it.code=="UNSUPPORTED_NC_ADDRESS_L"})

    val zero=StudioFanucProgramCompatibility.findings("M98 P4 L0")
    check(zero.any{it.code=="M98_FORMAT_L_NONPOSITIVE"})

    val fractional=StudioFanucProgramCompatibility.findings("M98 P4 L2.5")
    check(fractional.any{it.code=="M98_FORMAT_L_NOT_INTEGER"})

    val duplicate=StudioFanucProgramCompatibility.findings("M98 P4 L2 L3")
    check(duplicate.any{it.code=="M98_FORMAT_DUPLICATE_L"})

    println("FANUC_M98_REPEAT_PASS|P_SUBPROGRAM|L_REPEAT|POSITIVE_INTEGER|FAIL_CLOSED")
}
