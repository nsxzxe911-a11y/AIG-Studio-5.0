package com.aigstudio.core

object SimAcceptancePolicy {
    const val POLICY = "COLLISION_OVERCUT_CLEAR_AND_FIXTURE_COVERAGE_MODELED"

    fun formalAcceptAllowed(
        collisionCount:Int,
        overcutCount:Int,
        fixtureCoverageKnown:Boolean,
    ):Boolean = collisionCount==0 && overcutCount==0 && fixtureCoverageKnown

    fun formalAcceptAllowed(report:MachiningRiskReport):Boolean =
        formalAcceptAllowed(report.collisionCount,report.overcutCount,report.fixtureCoverageKnown)
}
