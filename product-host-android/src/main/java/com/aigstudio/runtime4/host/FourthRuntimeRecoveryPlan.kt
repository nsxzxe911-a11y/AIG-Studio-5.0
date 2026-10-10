package com.aigstudio.runtime4.host

data class RecoveryDomainStatus(
    val domain:String,
    val accepted:Boolean?,
    val missing:Boolean,
    val warning:String?=null,
)

data class RecoverySaveStatus(val domain:String,val warning:String?=null)

class FourthRuntimeRecoveryPlan(
    private val cadComplete:()->RecoveryDomainStatus,
    private val camComplete:()->RecoveryDomainStatus,
    private val ncComplete:()->RecoveryDomainStatus,
    private val cadSave:()->Unit,
    private val camSave:()->Unit,
    private val ncSave:()->Unit,
){
    fun completeAll():List<RecoveryDomainStatus> = listOf(
        safeComplete("CAD",cadComplete),
        safeComplete("CAM",camComplete),
        safeComplete("NC",ncComplete),
    )
    fun saveAll():List<RecoverySaveStatus> = listOf(
        safeSave("CAD",cadSave),safeSave("CAM",camSave),safeSave("NC",ncSave),
    )
    private fun safeComplete(domain:String,action:()->RecoveryDomainStatus):RecoveryDomainStatus =
        runCatching(action).getOrElse{RecoveryDomainStatus(domain,false,false,it.message?:it.javaClass.simpleName)}
    private fun safeSave(domain:String,action:()->Unit):RecoverySaveStatus =
        runCatching{action();RecoverySaveStatus(domain)}.getOrElse{RecoverySaveStatus(domain,it.message?:it.javaClass.simpleName)}
}