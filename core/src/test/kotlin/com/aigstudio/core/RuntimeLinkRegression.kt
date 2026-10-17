package com.aigstudio.core

private class BridgeTestRuntime(
    override val pageId:PageId,
    private var rev:Long,
    private var marker:String,
) : PageRuntime {
    override fun dispatch(command:PageCommand):PageResult = PageResult.Rejected(pageId,"NOT_USED",rev)
    override fun snapshot()=PageSnapshot(pageId,rev,mapOf("marker" to marker))
    override fun messages():List<PageMessage> = emptyList()
    override fun exportPayload(target:RuntimeLinkId):RuntimeBridgePayload? =
        RuntimeBridgeContract.payload(target,rev,mapOf("marker" to marker))
    override fun importPayload(source:RuntimeLinkId,payload:RuntimeBridgePayload):PageResult {
        val validation=RuntimeBridgeContract.validate(source,payload,rev)
        if(validation is RuntimeBridgeValidation.Rejected)
            return PageResult.Rejected(pageId,validation.code,rev,validation.detail)
        marker=payload.body["marker"].orEmpty()
        rev=payload.revision
        return PageResult.Accepted(pageId,"BRIDGE_IMPORT",rev,mapOf("marker" to marker))
    }
}

fun main() {
    testRuntimeLinkStateSyncContract()

    check(RuntimeLinkContract.DISCONNECT_POLICY=="DATA_FLOW_ONLY_PRESERVE_RUNTIME_DATA")
    check(RuntimeBridgeContract.definition(RuntimeLinkId.CAD_CAM).sourcePage==PageId.CAD)
    check(RuntimeBridgeContract.definition(RuntimeLinkId.CAD_CAM).targetPage==PageId.CAM)
    check(RuntimeBridgeContract.definition(RuntimeLinkId.CAM_SIM).targetPage==PageId.SIM)
    check(RuntimeBridgeContract.definition(RuntimeLinkId.SIM_NC).targetPage==PageId.NC)
    check(RuntimeBridgeContract.definition(RuntimeLinkId.NC_MACHINE).machineEndpoint)
    check(RuntimeBridgeContract.definition(RuntimeLinkId.MACHINE).linkId==RuntimeLinkId.NC_MACHINE)

    val valid=RuntimeBridgeContract.payload(RuntimeLinkId.CAD_CAM,2L,mapOf("geometry" to "GEO-2"))
    check(RuntimeBridgeContract.validate(RuntimeLinkId.CAD_CAM,valid,1L) is RuntimeBridgeValidation.Accepted)

    val stale=RuntimeBridgeContract.payload(RuntimeLinkId.CAD_CAM,1L,mapOf("geometry" to "OLD"))
    check((RuntimeBridgeContract.validate(RuntimeLinkId.CAD_CAM,stale,1L) as RuntimeBridgeValidation.Rejected).code=="STALE_REVISION")

    val badDigest=valid.copy(digest="0".repeat(64))
    check((RuntimeBridgeContract.validate(RuntimeLinkId.CAD_CAM,badDigest,1L) as RuntimeBridgeValidation.Rejected).code=="DIGEST_MISMATCH")

    val wrongTarget=valid.copy(targetPage=PageId.SIM)
    check((RuntimeBridgeContract.validate(RuntimeLinkId.CAD_CAM,wrongTarget,1L) as RuntimeBridgeValidation.Rejected).code=="WRONG_TARGET")

    val store=RuntimeLinkStore()
    val cad=BridgeTestRuntime(PageId.CAD,3L,"CAD-R3")
    val cam=BridgeTestRuntime(PageId.CAM,1L,"CAM-R1")
    store.set(RuntimeLinkId.CAD_CAM,RuntimeLinkStatus.DISCONNECTED)
    val cadBefore=cad.snapshot()
    val camBefore=cam.snapshot()
    val disconnected=RuntimeBridgeRouter.transfer(RuntimeLinkId.CAD_CAM,store,cad,cam)
    check(disconnected is RuntimeBridgeTransferResult.Rejected && disconnected.code=="DISCONNECTED")
    check(cad.snapshot()==cadBefore)
    check(cam.snapshot()==camBefore)

    store.set(RuntimeLinkId.CAD_CAM,RuntimeLinkStatus.CONNECTED)
    val transferred=RuntimeBridgeRouter.transfer(RuntimeLinkId.CAD_CAM,store,cad,cam)
    check(transferred is RuntimeBridgeTransferResult.Accepted)
    check(cam.snapshot().revision==3L)
    check(cam.snapshot().state["marker"]=="CAD-R3")

    val targetStable=cam.snapshot()
    val repeated=RuntimeBridgeRouter.transfer(RuntimeLinkId.CAD_CAM,store,cad,cam)
    check(repeated is RuntimeBridgeTransferResult.Rejected && repeated.code=="STALE_REVISION")
    check(cam.snapshot()==targetStable)

    println("RUNTIME_TYPED_BRIDGE_PASS|CAD_CAM|CAM_SIM|SIM_NC|NC_MACHINE|DISCONNECT_PRESERVES_DATA|STALE_REJECT|DIGEST_REJECT|NO_OVERWRITE")
}
