package com.aigstudio.core

enum class RuntimeFindingDisposition {
    STATUS_ONLY,
    ARTIFACT_INVALID,
    USER_ACTION_REQUIRED
}

object OpenRuntimePolicy {
    const val AI_RGB_ASSET_GENERATION_ENABLED = true
    const val AI_CODE_GENERATION_ENABLED = true
    const val AXIS_BLOCKING_ENABLED = false
    const val CNC_SOFTWARE_SAFETY_BLOCKING_ENABLED = false
    const val AUTO_REGRESSION_ENABLED = false
    const val AUTO_ROLLBACK_ENABLED = false
    const val AUTO_DOWNGRADE_ENABLED = false
    const val AI_VERSION_CONTROL_WRITE_ENABLED = false
    const val RED_CONTROL_CALLBACK_ENABLED = false
    const val MANUAL_ROLLBACK_ENABLED = false
    const val MANUAL_DOWNGRADE_ENABLED = false
    const val DIAGNOSTICS_ENABLED = true

    fun aiMayEnableVersionControlAction(action:String):Boolean = false
    fun redControlMayChangeVersion():Boolean = false

    fun disposition(failureClass: ContinuityFailureClass): RuntimeFindingDisposition = when (failureClass) {
        ContinuityFailureClass.COMPILE_RUNTIME,
        ContinuityFailureClass.INTEGRITY -> RuntimeFindingDisposition.ARTIFACT_INVALID

        ContinuityFailureClass.NETWORK,
        ContinuityFailureClass.INFRASTRUCTURE,
        ContinuityFailureClass.UI_STATUS,
        ContinuityFailureClass.PRODUCT_SAFETY -> RuntimeFindingDisposition.STATUS_ONLY
    }
}
