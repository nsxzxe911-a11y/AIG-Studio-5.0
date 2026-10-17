package com.aigstudio.core

import java.security.MessageDigest

data class RuntimeBridgeDefinition(
    val linkId:RuntimeLinkId,
    val schema:String,
    val sourcePage:PageId,
    val targetPage:PageId,
    val machineEndpoint:Boolean=false,
)

sealed interface RuntimeBridgeValidation {
    data object Accepted:RuntimeBridgeValidation
    data class Rejected(val code:String,val detail:String):RuntimeBridgeValidation
}

sealed interface RuntimeBridgeTransferResult {
    data class Accepted(
        val linkId:RuntimeLinkId,
        val sourceRevision:Long,
        val targetRevision:Long,
        val result:PageResult,
    ):RuntimeBridgeTransferResult
    data class Rejected(
        val linkId:RuntimeLinkId,
        val code:String,
        val detail:String,
    ):RuntimeBridgeTransferResult
}

object RuntimeBridgeContract {
    const val CAD_CAM_SCHEMA="aig-bridge-cad-cam-v1"
    const val CAM_SIM_SCHEMA="aig-bridge-cam-sim-v1"
    const val SIM_NC_SCHEMA="aig-bridge-sim-nc-v1"
    const val NC_MACHINE_SCHEMA="aig-bridge-nc-machine-v1"

    private val definitions=mapOf(
        RuntimeLinkId.CAD_CAM to RuntimeBridgeDefinition(
            RuntimeLinkId.CAD_CAM,CAD_CAM_SCHEMA,PageId.CAD,PageId.CAM
        ),
        RuntimeLinkId.CAM_SIM to RuntimeBridgeDefinition(
            RuntimeLinkId.CAM_SIM,CAM_SIM_SCHEMA,PageId.CAM,PageId.SIM
        ),
        RuntimeLinkId.SIM_NC to RuntimeBridgeDefinition(
            RuntimeLinkId.SIM_NC,SIM_NC_SCHEMA,PageId.SIM,PageId.NC
        ),
        RuntimeLinkId.NC_MACHINE to RuntimeBridgeDefinition(
            RuntimeLinkId.NC_MACHINE,NC_MACHINE_SCHEMA,PageId.NC,PageId.NC,machineEndpoint=true
        ),
    )

    fun canonical(id:RuntimeLinkId):RuntimeLinkId =
        if(id==RuntimeLinkId.MACHINE) RuntimeLinkId.NC_MACHINE else id

    fun definition(id:RuntimeLinkId):RuntimeBridgeDefinition {
        val canonical=canonical(id)
        return definitions[canonical] ?: error("Runtime link $id is infrastructure-only and has no machining payload contract")
    }

    fun payload(
        id:RuntimeLinkId,
        revision:Long,
        body:Map<String,String>,
    ):RuntimeBridgePayload {
        require(revision>=0L){"Bridge revision must be non-negative"}
        val definition=definition(id)
        val normalized=body.toSortedMap()
        val digest=digest(
            definition.schema,revision,definition.sourcePage,definition.targetPage,normalized
        )
        return RuntimeBridgePayload(
            schema=definition.schema,
            revision=revision,
            digest=digest,
            sourcePage=definition.sourcePage,
            targetPage=definition.targetPage,
            body=normalized,
        )
    }

    fun validate(
        id:RuntimeLinkId,
        payload:RuntimeBridgePayload,
        currentTargetRevision:Long,
    ):RuntimeBridgeValidation {
        val definition=runCatching{definition(id)}.getOrElse{
            return RuntimeBridgeValidation.Rejected("UNSUPPORTED_LINK",it.message.orEmpty())
        }
        if(payload.schema!=definition.schema)
            return RuntimeBridgeValidation.Rejected("SCHEMA_MISMATCH","Expected ${definition.schema}, got ${payload.schema}")
        if(payload.sourcePage!=definition.sourcePage)
            return RuntimeBridgeValidation.Rejected("WRONG_SOURCE","Expected ${definition.sourcePage.id}, got ${payload.sourcePage.id}")
        if(payload.targetPage!=definition.targetPage)
            return RuntimeBridgeValidation.Rejected("WRONG_TARGET","Expected ${definition.targetPage.id}, got ${payload.targetPage.id}")
        if(payload.revision<=currentTargetRevision)
            return RuntimeBridgeValidation.Rejected("STALE_REVISION","Incoming r${payload.revision} <= current r$currentTargetRevision")
        if(!Regex("[0-9a-f]{64}").matches(payload.digest.lowercase()))
            return RuntimeBridgeValidation.Rejected("DIGEST_FORMAT","Bridge digest must be SHA-256 hex")
        val expected=digest(
            payload.schema,payload.revision,payload.sourcePage,payload.targetPage,payload.body.toSortedMap()
        )
        if(payload.digest.lowercase()!=expected)
            return RuntimeBridgeValidation.Rejected("DIGEST_MISMATCH","Incoming bridge payload digest does not match body")
        return RuntimeBridgeValidation.Accepted
    }

    fun digest(
        schema:String,
        revision:Long,
        sourcePage:PageId,
        targetPage:PageId,
        body:Map<String,String>,
    ):String {
        val canonical=buildString {
            append(schema).append('\n')
            append(revision).append('\n')
            append(sourcePage.id).append("->").append(targetPage.id).append('\n')
            body.toSortedMap().forEach{(key,value)->
                append(key.length).append(':').append(key)
                    .append('=').append(value.length).append(':').append(value).append('\n')
            }
        }
        return MessageDigest.getInstance("SHA-256")
            .digest(canonical.toByteArray(Charsets.UTF_8))
            .joinToString(""){"%02x".format(it)}
    }
}

object RuntimeBridgeRouter {
    fun transfer(
        linkId:RuntimeLinkId,
        store:RuntimeLinkStore,
        source:PageRuntime,
        target:PageRuntime,
    ):RuntimeBridgeTransferResult {
        val canonical=RuntimeBridgeContract.canonical(linkId)
        val definition=runCatching{RuntimeBridgeContract.definition(canonical)}.getOrElse{
            return RuntimeBridgeTransferResult.Rejected(canonical,"UNSUPPORTED_LINK",it.message.orEmpty())
        }
        val linkStatus=if(linkId==RuntimeLinkId.MACHINE) store.status(RuntimeLinkId.MACHINE) else store.status(canonical)
        if(linkStatus!=RuntimeLinkStatus.CONNECTED)
            return RuntimeBridgeTransferResult.Rejected(canonical,"DISCONNECTED","$canonical data flow is disconnected")
        if(definition.machineEndpoint)
            return RuntimeBridgeTransferResult.Rejected(canonical,"MACHINE_ENDPOINT_REQUIRES_AUTHORIZATION","Use NC output authorization, not page-to-page import")
        if(source.pageId!=definition.sourcePage)
            return RuntimeBridgeTransferResult.Rejected(canonical,"WRONG_SOURCE_PAGE","Source page is ${source.pageId.id}")
        if(target.pageId!=definition.targetPage)
            return RuntimeBridgeTransferResult.Rejected(canonical,"WRONG_TARGET_PAGE","Target page is ${target.pageId.id}")

        val payload=source.exportPayload(canonical)
            ?: return RuntimeBridgeTransferResult.Rejected(canonical,"NO_PAYLOAD","Source page exported no payload")
        when(val validation=RuntimeBridgeContract.validate(canonical,payload,target.snapshot().revision)){
            is RuntimeBridgeValidation.Rejected -> return RuntimeBridgeTransferResult.Rejected(
                canonical,validation.code,validation.detail
            )
            RuntimeBridgeValidation.Accepted -> Unit
        }
        val imported=target.importPayload(canonical,payload)
        return if(imported is PageResult.Accepted)
            RuntimeBridgeTransferResult.Accepted(canonical,payload.revision,target.snapshot().revision,imported)
        else {
            val rejected=imported as PageResult.Rejected
            RuntimeBridgeTransferResult.Rejected(canonical,rejected.code,rejected.detail)
        }
    }
}
