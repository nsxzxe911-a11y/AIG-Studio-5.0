import com.aigstudio.production.runtime.CleanNcSession

fun main() {
    val s = CleanNcSession()
    val good = s.validate()
    check(good.ready) { "expected FANUC sample READY, got ${good.status}" }
    check(good.eventCount > 0)
    s.setProgram("G90 G54\nG999 X0.\nM30")
    val bad = s.validate()
    check(!bad.ready)
    check(bad.alarmLine == 2) { "expected alarm on line 2, got ${bad.alarmLine}" }
    check(bad.alarmText.contains("ALARM"))
    println("CLEAN_NC_RUNTIME_PASS|AIG_CNC|FANUC_READY_THEN_ALARM|L2|NO_CRASH")
}
