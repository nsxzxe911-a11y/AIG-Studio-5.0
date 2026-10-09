package com.aigstudio.core

import java.io.File
private const val FEATURE_SHA="3ec0347a027a9c7dee35d6ac011581b588e5c0c1"
private fun root375():File {
    val d=File(".").canonicalFile
    if(File(d,"release-version.properties").isFile)return d
    return d.parentFile.takeIf{it!=null && File(it,"release-version.properties").isFile} ?: error("root")
}
fun main(){
    val root=root375()
    check(File(root,"release-version.properties").readText().trim()=="versionName=375.0.0")
    val cp=File(root,"continuity/latest-checkpoint.json").readText()
    check("\"version\": \"375.0.0\"" in cp)
    check("\"branch\": \"feat/aig-cnc-375-link-tristate\"" in cp)
    check("\"recorded_source_head\": \"$FEATURE_SHA\"" in cp)
    check("TRISTATE_LINK_SOURCE_PASS_BINARY_PENDING" in cp)
    check("binary_runtime_evidence_374" in cp)
    check("binary_runtime_evidence_375" in cp && "SOURCE_PASS_BINARY_PENDING" in cp)
    check(RuntimeLinkStatus.entries.map{it.name}==listOf("CONNECTED","DEGRADED","DISCONNECTED"))
    check(RuntimeLinkContract.runtimeOwnedLinks==setOf(RuntimeLinkId.GPU_3D,RuntimeLinkId.MACHINE))
    check(File(root,"core/src/main/kotlin/com/aigstudio/core/RuntimeIssueRouting.kt").readText().contains("RuntimeLinkState(").not())
    println("AIGCNC_RELEASE_375_PASS|TRISTATE_LINK|SINGLE_SHARED_SNAPSHOT|BINARY_PENDING|HISTORICAL_374_PRESERVED")
}
