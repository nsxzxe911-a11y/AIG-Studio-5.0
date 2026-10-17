package com.aigstudio.core

object MachiningEvidenceSafetyPolicy {
    fun safeSimReuse(
        verified:Boolean,
        preflightReady:Boolean,
        fixtureCoverageKnown:Boolean,
    ):Boolean = verified && preflightReady && fixtureCoverageKnown

    fun safeSimReuse(evidence:MachiningStageEvidence?):Boolean = evidence!=null && safeSimReuse(
        evidence.verified,
        evidence.preflightReady,
        evidence.fixtureCoverageKnown,
    )
}
