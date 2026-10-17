package com.aigstudio.core

fun main(){
    check(!SimAcceptancePolicy.formalAcceptAllowed(0,0,false))
    check(!SimAcceptancePolicy.formalAcceptAllowed(1,0,true))
    check(!SimAcceptancePolicy.formalAcceptAllowed(0,1,true))
    check(SimAcceptancePolicy.formalAcceptAllowed(0,0,true))
    println("SIM_ACCEPTANCE_POLICY_PASS|FIXTURE_COVERAGE_REQUIRED")
}
