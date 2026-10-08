package com.aigstudio.core

import java.io.File

private fun releaseFile(vararg candidates:String):File =
    candidates.map(::File).firstOrNull { it.exists() } ?: error("release file missing: ${candidates.joinToString()}")

fun main() {
    val version=releaseFile("release-version.properties","../release-version.properties")
        .readText().trim()
    check(version=="versionName=373.0.0") { "expected AIG CNC 373, got $version" }

    val checkpoint=releaseFile("continuity/latest-checkpoint.json","../continuity/latest-checkpoint.json")
        .readText()
    check("\"version\": \"373.0.0\"" in checkpoint)
    check("\"branch\": \"feat/aig-cnc-373-runtime-link-repair\"" in checkpoint)
    check("FULL_RUNTIME_LINK_REPAIR" in checkpoint)

    val historical=releaseFile("continuity/rgb-restoration-20261008.json","../continuity/rgb-restoration-20261008.json")
        .readText()
    check("\"version\": \"372.0.0\"" in historical) { "historical 372 RGB evidence was rewritten" }

    println("AIGCNC_RELEASE_373_PASS|FORWARD_ONLY|LATEST_CHECKPOINT_373|HISTORICAL_372_PRESERVED")
}
