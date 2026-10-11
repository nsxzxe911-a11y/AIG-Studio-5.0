package com.aigstudio.runtime4.contract

sealed interface AiCommand {
    data object OpenMain:AiCommand
    data class Stage(val program:String):AiCommand
    data object Verify:AiCommand
    data object Promote:AiCommand
    data object RestoreWorkingToMain:AiCommand
    data object ClearLocalMessage:AiCommand
}

data class AiState(
    val available:Boolean=true,
    val vaultState:String="READY",
    val summary:String="AI LOCAL VAULT READY",
    val immutableMainDigest:String="",
    val workingDigest:String="",
    val verifiedDigest:String="",
    val hasChanges:Boolean=false,
    val verified:Boolean=false,
    val issueCount:Int=0,
    val currentMain:String="",
    val workingProgram:String="",
    val message:RuntimeMessage?=null,
)
data class AiDispatchResult(val accepted:Boolean,val state:AiState)
interface AiRuntimePort { fun snapshot():AiState; fun dispatch(command:AiCommand):AiDispatchResult }
