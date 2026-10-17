package com.aigstudio.core

fun main(){
    val program="G90 G0 X0 Y0 Z5 C0\nG1 X10 Y5 Z-2 A10 B20 C30 F150"
    check(NcSixAxisCompatibility.cFindings(program).isEmpty())
    val legacy=NcSixAxisCompatibility.legacyProgram(program)
    check(!Regex("""(?i)(?<![A-Z])C\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)""").containsMatchIn(legacy))
    check(NcSixAxisCompatibility.cFindings("G1 X1 C361 F100").any{it.code=="AXIS_C_TRAVEL_LIMIT_EXCEEDED"})
    check(NcSixAxisCompatibility.cFindings("G1 X1 C10 C20 F100").any{it.code=="DUPLICATE_AXIS_WORD_C"})
    check(NcSixAxisCompatibility.cFindings("G1 X1 C F100").any{it.code=="MALFORMED_NUMERIC_WORD_C"})
    println("NC_SIX_AXIS_COMPAT_PASS|C_VALIDATION|LEGACY_SANITIZE|FAIL_CLOSED")
}
