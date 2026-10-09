import com.aigstudio.production.runtime.CleanAxisSession

fun main() {
    val a4=CleanAxisSession("4AX")
    a4.rotateA(30.0); check(a4.snapshot().a==30.0); check(a4.snapshot().b==0.0 && a4.snapshot().c==0.0)
    val a5=CleanAxisSession("5AX")
    a5.rotateA(20.0); a5.rotateB(-35.0); check(a5.snapshot().a==20.0 && a5.snapshot().b==-35.0)
    val a6=CleanAxisSession("6AX")
    a6.rotateA(15.0); a6.rotateB(25.0); a6.rotateC(45.0); check(a6.snapshot().c==45.0)
    println("CLEAN_AXIS_RUNTIME_PASS|AIG_CNC|4AX=A|5AX=A_B|6AX=A_B_C|REAL_STATE")
}
