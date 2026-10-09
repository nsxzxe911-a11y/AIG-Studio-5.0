package com.aigstudio.core

import java.io.File
private const val FEATURE_SHA="678f5247ddbd042ba33cdf93ae69cfe0f25f0291"
private fun root376():File {
    val d=File(".").canonicalFile
    if(File(d,"release-version.properties").isFile)return d
    return d.parentFile.takeIf{it!=null && File(it,"release-version.properties").isFile} ?: error("root")
}
fun main(){
    val root=root376()
    check(File(root,"release-version.properties").readText().trim()=="versionName=376.0.0")
    val cp=File(root,"continuity/latest-checkpoint.json").readText()
    check("\"version\": \"376.0.0\"" in cp)
    check("\"branch\": \"feat/aig-cnc-376-link-waiting\"" in cp)
    check("\"recorded_source_head\": \"$FEATURE_SHA\"" in cp)
    check("LINK_WAITING_BINARY_INSTALLER_PASS" in cp)
    check("binary_runtime_evidence_375" in cp)
    check("binary_runtime_evidence_376" in cp && "PASS_APK_SETUP_INSTALL_LAUNCH_UNINSTALL" in cp)
    check("4b77ef4d7a55aa04787c21b9712c974c5147b47864978e13f01a204859d60fe9" in cp)
    check("5b90476b86ae6991a7059fea2473443803ea31219d97c691f26411f9db074479" in cp)
    check("\"installed_version\": \"3.76.0\"" in cp)
    check(RuntimeLinkStatus.entries.map{it.name}==listOf("CONNECTED","DEGRADED","DISCONNECTED"))
    check(RuntimeLinkPresentation.label(RuntimeLinkStatus.DISCONNECTED)=="\u7b49\u5f85")
    check(RuntimeLinkPresentation.label(RuntimeLinkStatus.DISCONNECTED)!="\u96e2\u7dda")
    println("AIGCNC_RELEASE_376_PASS|TRISTATE_INTERNAL|WAITING_PRESENTATION|BINARY_INSTALLER_PASS|HISTORICAL_375_PRESERVED")
}
