package com.aigstudio.core

private fun ncCmd(page:String,id:String,vararg args:Pair<String,String>)=
    PageCommand(PageId.NC,PageCatalog.requireSubpage(page),id,mapOf(*args))

fun main(){
    val nc=NcPageRuntime()
    check(nc.dispatch(ncCmd("NC.EDITOR","NC.EDITOR.INSERT","text" to "G90 G54\nG0 X0 Y0 Z5\nG1 X10 Y0 Z-2 F150\nM30")) is PageResult.Accepted)
    check(nc.snapshot().state["lineCount"]=="4")

    check(nc.dispatch(ncCmd("NC.EDITOR","NC.EDITOR.BLOCK_SKIP","enabled" to "true")) is PageResult.Accepted)
    check(nc.dispatch(ncCmd("NC.VERIFY","NC.VERIFY.SINGLE_BLOCK","enabled" to "true")) is PageResult.Accepted)
    check(nc.dispatch(ncCmd("NC.VERIFY","NC.VERIFY.DRY_RUN","enabled" to "true")) is PageResult.Accepted)

    check(nc.dispatch(ncCmd("NC.EDITOR","NC.EDITOR.CUSTOM_M_CODE","code" to "M42")) is PageResult.Accepted)
    check("M42" in nc.customMCodes())

    val parsed=nc.dispatch(ncCmd("NC.PARSER","NC.PARSER.PARSE")) as PageResult.Accepted
    check(parsed.evidence["parserStatus"]=="PASS")
    val preview=nc.dispatch(ncCmd("NC.PREVIEW","NC.PREVIEW.RENDER")) as PageResult.Accepted
    check(preview.evidence.getValue("eventCount").toInt()>0)

    val verify=nc.dispatch(ncCmd("NC.VERIFY","NC.VERIFY.RUN")) as PageResult.Accepted
    check(verify.evidence["verified"]=="true")
    check(nc.snapshot().state["verified"]=="true")
    val prepared=nc.dispatch(ncCmd("NC.OUTPUT","NC.OUTPUT.PREPARE")) as PageResult.Accepted
    check(prepared.evidence["machineEligible"]=="true")

    val blockedMachine=nc.dispatch(ncCmd("NC.OUTPUT","NC.OUTPUT.SEND_MACHINE"))
    check(blockedMachine is PageResult.Rejected)
    nc.setMachineConnected(true)
    check(nc.dispatch(ncCmd("NC.OUTPUT","NC.OUTPUT.SEND_MACHINE")) is PageResult.Accepted)

    val six=NcPageRuntime()
    val sixProgram="G90 G54\nG0 X0 Y0 Z5 C0\nG1 X10 Y0 Z-2 A10 B20 C30 F150\nM30"
    check(six.dispatch(ncCmd("NC.EDITOR","NC.EDITOR.INSERT","text" to sixProgram)) is PageResult.Accepted)
    val sixParsed=six.dispatch(ncCmd("NC.PARSER","NC.PARSER.PARSE")) as PageResult.Accepted
    check(sixParsed.evidence["cAxis"]=="VALIDATED")
    check(six.dispatch(ncCmd("NC.PREVIEW","NC.PREVIEW.RENDER")) is PageResult.Accepted)
    val sixVerify=six.dispatch(ncCmd("NC.VERIFY","NC.VERIFY.RUN")) as PageResult.Accepted
    check(sixVerify.evidence["cAxis"]=="VALIDATED")
    val sixPrepared=six.dispatch(ncCmd("NC.OUTPUT","NC.OUTPUT.PREPARE")) as PageResult.Accepted
    check(sixPrepared.evidence["cAxis"]=="VALIDATED")
    check(six.ncText().contains("C30"))

    val badC=NcPageRuntime()
    badC.dispatch(ncCmd("NC.EDITOR","NC.EDITOR.INSERT","text" to "G90\nG1 X1 C361 F150"))
    val badCParse=badC.dispatch(ncCmd("NC.PARSER","NC.PARSER.PARSE"))
    check(badCParse is PageResult.Rejected)
    check(badC.messages().last().detail.contains("C"))

    val bad=NcPageRuntime()
    bad.dispatch(ncCmd("NC.EDITOR","NC.EDITOR.INSERT","text" to "G90\nG1 X1 X2 F150"))
    val badParse=bad.dispatch(ncCmd("NC.PARSER","NC.PARSER.PARSE"))
    check(badParse is PageResult.Rejected)
    check(bad.messages().last().pageId==PageId.NC)
    check(bad.snapshot().state["lineCount"]=="2")
    check(bad.dispatch(ncCmd("NC.OUTPUT","NC.OUTPUT.PREPARE")) is PageResult.Rejected)

    val delete=NcPageRuntime()
    delete.dispatch(ncCmd("NC.EDITOR","NC.EDITOR.INSERT","text" to "G90\nM30"))
    check(delete.dispatch(ncCmd("NC.EDITOR","NC.EDITOR.DELETE","line" to "1")) is PageResult.Accepted)
    check(delete.snapshot().state["lineCount"]=="1")

    println("NC_PAGE_RUNTIME_PASS|EDITOR|INTERLOCK_PARSER|TIMELINE_PREVIEW|VERIFY|INLINE_ALARM|SINGLE_BLOCK|DRY_RUN|BLOCK_SKIP|CUSTOM_M|6AX_C_COMPAT|MACHINE_FAIL_CLOSED")
}
