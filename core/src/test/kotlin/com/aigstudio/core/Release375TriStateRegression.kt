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
    check("TRISTATE_LINK_BINARY_INSTALLER_PASS" in cp)
    check("binary_runtime_evidence_374" in cp)
    check("binary_runtime_evidence_375" in cp && "PASS_APK_SETUP_INSTALL_LAUNCH_UNINSTALL" in cp)
    check("9013e7045a94d0e47fc7d520355a4efa4a6286d6f30484712235aa3d44b96c53" in cp)
    check("96c61ff476199012c4d4854855122e44c99b7a5cfb2f1f44ed4aeaf6bf9c80bf" in cp)
    check("\"pe_machine\": \"0x8664\"" in cp)
    check("\"installed_version\": \"3.75.0\"" in cp)
    check("\"installed_runtime_smoke\": \"PASS\"" in cp)
    check("\"uninstall_install_dir_removed\": true" in cp)
    check("\"uninstall_registry_removed\": true" in cp)
    check(RuntimeLinkStatus.entries.map{it.name}==listOf("CONNECTED","DEGRADED","DISCONNECTED"))
    check(RuntimeLinkContract.runtimeOwnedLinks==setOf(RuntimeLinkId.GPU_3D,RuntimeLinkId.MACHINE))
    check(File(root,"core/src/main/kotlin/com/aigstudio/core/RuntimeIssueRouting.kt").readText().contains("RuntimeLinkState(").not())
    println("AIGCNC_RELEASE_375_PASS|TRISTATE_LINK|SINGLE_SHARED_SNAPSHOT|BINARY_INSTALLER_PASS|HISTORICAL_374_PRESERVED")
}
