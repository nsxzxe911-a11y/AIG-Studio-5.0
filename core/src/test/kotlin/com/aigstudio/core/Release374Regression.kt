package com.aigstudio.core

import java.io.File
import java.security.MessageDigest
private fun sha256(file:File):String=MessageDigest.getInstance("SHA-256").digest(file.readBytes()).joinToString(""){"%02x".format(it)}
private const val FEATURE_SHA="bcaa848290e21a4e021cdb333abdc4503c60aac4"
private fun rel374(vararg candidates:String):File=candidates.map(::File).firstOrNull{it.exists()} ?: error("release file missing")
fun main(){
    val version=rel374("release-version.properties","../release-version.properties").readText().trim()
    check(version=="versionName=374.0.0"){"expected AIG CNC 374, got $version"}
    val cp=rel374("continuity/latest-checkpoint.json","../continuity/latest-checkpoint.json").readText()
    check("\"product\": \"AIG CNC\"" in cp)
    check("\"version\": \"374.0.0\"" in cp)
    check("\"branch\": \"feat/aig-cnc-374-runtime-link-completion\"" in cp)
    check("\"recorded_source_head\": \"$FEATURE_SHA\"" in cp)
    check("FULL_RUNTIME_LINK_COMPLETION_BINARY_INSTALLER_PASS" in cp)
    check("binary_runtime_evidence_373" in cp)
    check("binary_runtime_evidence_374" in cp && "PASS_APK_PORTABLE_SETUP_INSTALL_LAUNCH_UNINSTALL" in cp)
    check("2513b88381948f96ed3f855dcfd4cc528b421753b2c3a69f5fdc1d2de92b78f9" in cp)
    check("cc3822b7c817d541ae85cf2c70a88fa261fcebb2f154ef16836f636388cf895f" in cp)
    check("0d8c00c397f1ddfef47cbc76f7020c4ffd9a67504709bba8d40d04ba093b04e2" in cp)
    check("uninstall_install_dir_removed\": true" in cp && "uninstall_registry_removed\": true" in cp)
    val root=rel374("release-version.properties","../release-version.properties").parentFile
    check(sha256(File(root,"release/android/AIG_CNC_374_FULL_INSTALLABLE.apk"))=="2513b88381948f96ed3f855dcfd4cc528b421753b2c3a69f5fdc1d2de92b78f9")
    check(sha256(File(root,"release/windows/AIG_CNC_374_PORTABLE.zip"))=="cc3822b7c817d541ae85cf2c70a88fa261fcebb2f154ef16836f636388cf895f")
    check(sha256(File(root,"release/windows/AIG_Studio_5_0_RGB_FULL_RELEASE_PC.exe"))=="0d8c00c397f1ddfef47cbc76f7020c4ffd9a67504709bba8d40d04ba093b04e2")
    check(ProductionActionContract.actions.all{it.android.availability==ProductionActionAvailability.CONNECTED && it.windows.availability==ProductionActionAvailability.CONNECTED})
    val historical=rel374("continuity/rgb-restoration-20261008.json","../continuity/rgb-restoration-20261008.json").readText()
    check("\"version\": \"372.0.0\"" in historical)
    println("AIGCNC_RELEASE_374_PASS|FORWARD_ONLY|ALL_ACTIONS_CONNECTED|V4_LAYER|BINARY_PASS|HISTORICAL_373_PRESERVED")
}
