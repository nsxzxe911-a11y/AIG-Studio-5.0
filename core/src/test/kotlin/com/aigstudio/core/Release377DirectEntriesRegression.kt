package com.aigstudio.core

import java.io.File

private const val FEATURE_SHA = "a572bb7e8e5e914f9f9bbe8482f7856b71fc9f84"
private fun root377Release(): File {
    var dir=File(".").canonicalFile
    repeat(8) {
        if(File(dir,"release-version.properties").isFile) return dir
        dir=dir.parentFile ?: return@repeat
    }
    error("root")
}

fun main() {
    val root=root377Release()
    check(File(root,"release-version.properties").readText().trim()=="versionName=377.0.0")
    val cp=File(root,"continuity/latest-checkpoint.json").readText()
    check("\"version\": \"377.0.0\"" in cp)
    check("\"branch\": \"feat/aig-cnc-377-direct-3ax-nc\"" in cp)
    check("\"recorded_source_head\": \"$FEATURE_SHA\"" in cp)
    check("DIRECT_3AX_GCODE_BINARY_INSTALLER_PASS" in cp)
    check("direct_home_entries_377" in cp)
    check("NO_CAM_PREREQ_FOR_3AX_PREVIEW" in cp)
    check("DIRECT_GCODE_EDITOR" in cp)
    check("binary_runtime_evidence_376" in cp && "PASS_APK_SETUP_INSTALL_LAUNCH_UNINSTALL" in cp)
    check("binary_runtime_evidence_377" in cp && "PASS_APK_SETUP_INSTALL_LAUNCH_UNINSTALL" in cp)
    check("f23c4b79d8515dba1711327b6ca87a18e6b8798aabbbf8f127005d658a76e3cc" in cp)
    check("0f816e93c19fd70e5d1f83b1a44bc1aa75da6911a1457ef5545a44b71bac0352" in cp)
    check("\"pe_machine\": \"0x8664\"" in cp)
    check("\"installed_version\": \"3.77.0\"" in cp)
    check("\"nox_direct_3ax_no_cam\": \"PASS\"" in cp)
    check("\"nox_direct_gcode_editor\": \"PASS\"" in cp)
    check("\"uninstall_install_dir_removed\": true" in cp)
    check("\"uninstall_registry_removed\": true" in cp)
    println("AIGCNC_RELEASE_377_PASS|DIRECT_3AX|DIRECT_GCODE|BINARY_INSTALLER_PASS|HISTORICAL_376_PRESERVED")
}
