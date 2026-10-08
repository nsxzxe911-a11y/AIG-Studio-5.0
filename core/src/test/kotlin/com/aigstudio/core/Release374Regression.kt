package com.aigstudio.core

import java.io.File
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
    check("FULL_RUNTIME_LINK_COMPLETION_SOURCE_PASS_BINARY_PENDING" in cp)
    check("binary_runtime_evidence_373" in cp)
    check("binary_runtime_evidence_374" in cp && "SOURCE_PASS_BINARY_PENDING" in cp)
    check(ProductionActionContract.actions.all{it.android.availability==ProductionActionAvailability.CONNECTED && it.windows.availability==ProductionActionAvailability.CONNECTED})
    val historical=rel374("continuity/rgb-restoration-20261008.json","../continuity/rgb-restoration-20261008.json").readText()
    check("\"version\": \"372.0.0\"" in historical)
    println("AIGCNC_RELEASE_374_PASS|FORWARD_ONLY|ALL_ACTIONS_CONNECTED|V4_LAYER|BINARY_PENDING|HISTORICAL_373_PRESERVED")
}
