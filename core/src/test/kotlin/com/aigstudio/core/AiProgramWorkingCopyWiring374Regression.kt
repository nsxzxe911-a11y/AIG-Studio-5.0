package com.aigstudio.core

import java.io.File
private fun rootAi374():File {
    val d=File(".").canonicalFile
    if(File(d,"core").isDirectory)return d
    return d.parentFile.takeIf{it!=null && File(it,"core").isDirectory} ?: error("root")
}
fun main(){
    val root=rootAi374()
    val desktop=File(root,"desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt").readText()
    val android=File(root,"app/src/main/java/com/aigstudio/app/MainActivity.kt").readText()
    check("showAiProgramWorkingCopy(" in desktop)
    check("AiProgramNcVerifier.verify" in desktop)
    check("runtimeNcDraft=promoted" in desktop.replace(" ",""))
    check("ncPostPrefs.put(\"manual_nc_draft\",promoted)" in desktop.replace(" ",""))
    check("showAiProgramWorkingCopyDialog()" in android)
    check("AiProgramNcVerifier.verify" in android)
    check("unifiedNcDraft=promoted" in android.replace(" ",""))
    check("saveCadCheckpoint()" in android)
    val spec=ProductionActionContract.spec("AI_WORKING_COPY")
    check(spec.android.availability==ProductionActionAvailability.CONNECTED)
    check(spec.windows.availability==ProductionActionAvailability.CONNECTED)
    println("AIGCNC_374_AI_WORKING_COPY_WIRING_PASS|ANDROID|WINDOWS|NC_DRAFT|RECOVERY|EXPLICIT_PROMOTE")
}
