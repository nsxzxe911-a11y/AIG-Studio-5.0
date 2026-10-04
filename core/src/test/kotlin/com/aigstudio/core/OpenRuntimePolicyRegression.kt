package com.aigstudio.core

fun main() {
    check(OpenRuntimePolicy.AI_RGB_ASSET_GENERATION_ENABLED)
    check(OpenRuntimePolicy.AI_CODE_GENERATION_ENABLED)
    check(!OpenRuntimePolicy.AXIS_BLOCKING_ENABLED)
    check(!OpenRuntimePolicy.CNC_SOFTWARE_SAFETY_BLOCKING_ENABLED)
    check(!OpenRuntimePolicy.AUTO_REGRESSION_ENABLED)
    check(!OpenRuntimePolicy.AUTO_ROLLBACK_ENABLED)
    check(!OpenRuntimePolicy.AUTO_DOWNGRADE_ENABLED)
    check(OpenRuntimePolicy.DIAGNOSTICS_ENABLED)

    check(OpenRuntimePolicy.disposition(ContinuityFailureClass.PRODUCT_SAFETY) == RuntimeFindingDisposition.STATUS_ONLY)
    check(OpenRuntimePolicy.disposition(ContinuityFailureClass.UI_STATUS) == RuntimeFindingDisposition.STATUS_ONLY)
    check(OpenRuntimePolicy.disposition(ContinuityFailureClass.NETWORK) == RuntimeFindingDisposition.STATUS_ONLY)
    check(OpenRuntimePolicy.disposition(ContinuityFailureClass.INFRASTRUCTURE) == RuntimeFindingDisposition.STATUS_ONLY)
    check(OpenRuntimePolicy.disposition(ContinuityFailureClass.COMPILE_RUNTIME) == RuntimeFindingDisposition.ARTIFACT_INVALID)
    check(OpenRuntimePolicy.disposition(ContinuityFailureClass.INTEGRITY) == RuntimeFindingDisposition.ARTIFACT_INVALID)

    check(!DepartmentContinuityPolicy.blocksRelease(ContinuityFailureClass.PRODUCT_SAFETY))
    check(DepartmentContinuityPolicy.blocksRelease(ContinuityFailureClass.COMPILE_RUNTIME))
    check(DepartmentContinuityPolicy.blocksRelease(ContinuityFailureClass.INTEGRITY))

    val cncScoped = AiPackageArtifact(
        id = "5ax-policy-probe",
        version = "361.0.0",
        sha256 = "0".repeat(64),
        downloadUrl = "local://probe",
        safetyScope = UpdateSafetyScope.COLLISION
    )
    check(!RollingUpdatePolicy.requiresCncRegression(listOf(cncScoped)))
    check(RollingUpdatePolicy.canPromote(
        currentBaseline = "360.0.0",
        candidateVersion = "361.0.0",
        relevantGatePass = true,
        allDigestsVerified = true,
        cncRegressionRequired = true,
        cncRegressionPass = false
    ))
    check(RollingUpdatePolicy.updateAllowed("360.0.0", "360.0.0", "361.0.0"))
    check(!RollingUpdatePolicy.updateAllowed("360.0.0", "360.0.0", "359.0.0"))
    check(!RollingUpdatePolicy.ALLOW_DOWNGRADE)

    println("OPEN_RUNTIME_POLICY_GATE_PASS|STATUS_ONLY|ARTIFACT_INVALID|NO_AUTO_REGRESSION|NO_AUTO_ROLLBACK|NO_DOWNGRADE")
}
